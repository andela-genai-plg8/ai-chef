import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import useChat from "@/hooks/useChat";
import styles from "./Styles.module.scss";
import ReactMarkdown from "react-markdown";
import { useRecipes } from "@/hooks/useRecipes";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";
import { useModels } from "@/hooks/useRecipeQuery";
import { Model } from "shared-types";
import { Link } from "react-router-dom";
import { FaMicrophone, FaSpeakap, FaTimes } from "react-icons/fa";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";

type ChatMessageProps = {
  msg: { content: string; role: string };
  className?: string;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ msg, className }) => {
  return (
    <div className={classNames(className)}>
      <ReactMarkdown components={{
        a: ({ node, ...props }) => {
          const href = props.href || "";

          // If it's an internal link (relative URL), use React Router <Link>
          if (href.startsWith("/")) {
            return <Link className={styles.Link} to={href}>{props.children}</Link>;
          }

          // Otherwise, fall back to normal <a>
          return <a {...props} />;
        },
      }}>{msg.content}</ReactMarkdown>
    </div>
  );
};

const Chat = () => {
  let [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  // Persisted open state (default: true). Guard access for SSR.
  const [open, setOpen] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('chat.open');
      return stored === null ? true : stored === 'true';
    } catch (e) {
      return true;
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [maxInputHeight, setMaxInputHeight] = useState<number>(150);
  const navigate = useNavigate();

  const messages = useChat((state) => state.messages);
  const searchedRecipes = useRecipes((state) => state.searchedRecipes);
  const currentModel = useChat((state) => state.currentModel);
  const setCurrentModel = useChat((state) => state.setCurrentModel);
  const sendMessage = useChat((state) => state.sendMessage);
  const addMessage = useChat((state) => state.addMessage);

  const [recorder, setRecorder] = useState<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: { modelsByProviders: supportedModels, models } = { models: [], modelsByProviders: {} }, isLoading: isLoadingModels } = useModels(true);
 
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Recompute max input height based on message container height (30%)
  useEffect(() => {
    const computeMax = () => {
      const container = messageContainerRef.current;
      if (!container) return;
      const h = container.clientHeight || 0;
      setMaxInputHeight(Math.max(80, Math.floor(h * 0.3))); // at least 80px
    };
    computeMax();
    window.addEventListener("resize", computeMax);
    return () => window.removeEventListener("resize", computeMax);
  }, []);

  // Persist `open` state to localStorage when it changes.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem('chat.open', String(open));
    } catch (e) {
      // ignore storage errors (e.g., blocked in private mode)
    }
  }, [open]);

  // Adjust when messages change (container height might change)
  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;
    const h = container.clientHeight || 0;
    setMaxInputHeight(Math.max(80, Math.floor(h * 0.3)));
  }, [messages]);

  const startListening = async () => {
    await initRecorder();
    recorder && recorder.start();
  }

  const handleVoiceSend = async () => {
    recorder && recorder.state === "recording" && recorder.stop();
  };

  const handleSend = async () => {
    setLoading(true);
    if (!input?.trim()) {
      setLoading(false);
      return;
    }

    addMessage({ role: "user", content: input });
    await sendMessage();
    setInput("");
    setLoading(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (models?.length || 0 > 0) {
      if (open && messages.length === 0) {
        addMessage({ role: "initial", content: "Hello" });
        sendMessage();
      }

      // if the list does not contain the current model, change the current model
      if ((models || []).findIndex((m: Model) => m.id === currentModel) === -1) {
        const firstModel = Object.values(supportedModels).flatMap((group: any) => group.models)[0];
        if (firstModel) {
          setCurrentModel(firstModel.id);
        }
      }
    }
  }, [models?.length, messages.length, sendMessage, addMessage, open]);

  // auto-resize textarea up to maxInputHeight
  const adjustTextareaHeight = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    // determine a reasonable minimum height in px (match CSS --min-input-h)
    const minInputH = 18; // matches SCSS --min-input-h fallback
    const scrollH = ta.scrollHeight || minInputH;
    const clamped = Math.min(Math.max(scrollH, minInputH), maxInputHeight);
    ta.style.height = `${clamped}px`;
  };

  // adjust whenever input or maxInputHeight changes
  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [input, maxInputHeight]);

  const containerHeight: string = useMemo(() => {
    if (inputRef.current && !inputRef.current.textContent?.includes("\n")) {
      return `${inputRef.current.getBoundingClientRect().height}px`;
    }

    return "auto"
  }, [inputRef?.current?.textContent]);

  // Multiline input: Enter inserts newline; Enter without shift sends (matches previous behavior)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderModelDropdown = useMemo(() => {
    if (!supportedModels || Object.keys(supportedModels).length === 0) {
      return <option disabled value="gpt-gpt-4o">Loading...</option>;
    }

    return Object.entries(supportedModels).map(([groupKey, group]) => {
      // Type assertion for group
      const provider = group as { title: string; models: Model[] };
      return (
        <optgroup key={groupKey} label={provider.title}>
          {(provider.models || []).map((model: Model) => {
            return (
              <option key={model.id || model.title} value={model.id}>
                {model.title}
              </option>
            );
          })}
        </optgroup>
      );
    });
  }, [models?.length]);

  //where there is at least one item in the searchedRecipes, navigate the user to recipes/search
  useEffect(() => {
    if (open && searchedRecipes.length > 0) {
      navigate("/recipes/search");
    }
  }, [searchedRecipes, open]);

  // Floating widget toggle button
  if (!open) {
    return (
      <button className={styles.ToggleButton} onClick={() => setOpen(true)} title="Chat with Chef">
        <span role="img" aria-label="chef">👨‍🍳</span>
      </button>
    );
  }

  const initRecorder = async () => {
    if (!recorder) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        const speechResponse = await axios.post(
          "/api/speechToText",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        var speechResponseData = speechResponse.data;
        input = speechResponseData.speechMessage;
        setInput(input);
        setLoading(true);
        if (!input?.trim()) {
          setLoading(false);
          return;
        }

        addMessage({ role: "user", content: input });
        await sendMessage();
        setInput("");
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };

      setRecorder(mediaRecorder);
    }
  };

  return (
    <div className={styles.Chat}>
      <div className={styles.Header}>
        <h5>Chef</h5>
        <button
          className={styles.CloseButton}
          onClick={() => setOpen(false)}
          title="Close"
        >
          <FaTimes />
        </button>
      </div>
      
      <div
        className={styles.MessageContainer}
        ref={messageContainerRef}
      >
        {messages
          .filter((msg) => msg.role !== "initial" && msg.content?.length > 0 && ["user", "assistant"].includes(msg.role?.toLowerCase()))
          .map((msg, i) => (
            <div
              key={i}
              className={classNames(styles.Message, {
                [styles.Assistant]: msg.role === "assistant",
                [styles.User]: msg.role === "user",
              })}
              style={{ maxWidth: "70%" }}
            >
              <ChatMessage msg={{ content: msg.content, role: msg.role }} />
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.InputGroup}
        style={{ height: (containerHeight), maxHeight: maxInputHeight }}>
        <textarea
          rows={1}
          className={styles.Input}
          placeholder="What do you want to prepare?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          ref={inputRef}
          style={{ maxHeight: maxInputHeight, height: 22 }}
        />
        <div className={styles.Buttons}>
          {
            user &&
            <button
            className={styles.SpeechButton}
            onMouseDown={startListening}
            onTouchStart={startListening}
            onMouseUp={handleVoiceSend}
            onMouseLeave={handleVoiceSend}
            onTouchEnd={handleVoiceSend}
            disabled={loading}
            aria-label="Listen"
            title="Push to talk"
          >
            {loading ? (
              "..."
            ) : (
              <FaMicrophone />
            )}
          </button>}
          <button
            className={styles.SendButton}
            onClick={handleSend}
            disabled={!input?.trim() || loading}
            aria-label="Send message"
            title="Send"
          >
            {loading ? (
              "..."
            ) : (
              // up arrow icon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 4L12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 10L12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
// Renamed from Chat.jsx to Chat.tsx

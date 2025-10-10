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
import { FaChevronUp, FaMicrophone, FaStop, FaTimes } from "react-icons/fa";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import useAudioRecorder from "@/hooks/useAudioRecorder";

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
  const [input, setInput] = useState("");
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(() => {
    try {
      if (typeof window === 'undefined') return undefined;
      const stored = localStorage.getItem('chat.selectedDeviceId');
      return stored === null ? undefined : stored;
    } catch (e) {
      return undefined;
    }
  });

  const { toggle, checkIfAudioIsSilent, isRecording, inputDevices, refreshInputDevices, isSilent, signalLevelDb } = useAudioRecorder({
    deviceId: selectedDeviceId,
    onStop: async (blob) => {
      try {
        const isRecordingEmpty = await checkIfAudioIsSilent(blob);
        if (!isRecordingEmpty) {
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");

          const speechResponse = await axios.post(
            "/api/speechToText",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          const speechResponseData = speechResponse.data;
          const speechMessage = speechResponseData?.speechMessage || "";

          if (!speechMessage?.trim()) return;
          setInput(speechMessage);
          setLoading(true);
          addMessage({ role: "user", content: speechMessage });
          await sendMessage();
          setInput("");
          setLoading(false);
          if (inputRef.current) inputRef.current.focus();
        }
      } catch (err) {
        console.error("Error processing recorded audio:", err);
        setLoading(false);
      }
    }
  });

  const [showDevices, setShowDevices] = useState<boolean>(false);

  // Persist selected device id when it changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (selectedDeviceId) {
        localStorage.setItem('chat.selectedDeviceId', selectedDeviceId);
      } else {
        localStorage.removeItem('chat.selectedDeviceId');
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [selectedDeviceId]);

  // If the selected device disappears from the available list, clear it so we fall back to default
  useEffect(() => {
    if (!inputDevices) return;
    if (!selectedDeviceId) return;
    const found = inputDevices.find((d) => d.deviceId === selectedDeviceId);
    if (!found) {
      setSelectedDeviceId(undefined);
    }
  }, [inputDevices, selectedDeviceId]);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const chatTextContainerRef = useRef<HTMLDivElement | null>(null);
  const pushTalkRef = useRef<HTMLButtonElement | null>(null);
  const deviceButtonRef = useRef<HTMLButtonElement | null>(null);
  const [togglePosition, setTogglePosition] = useState<React.CSSProperties>({});

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!showDevices) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (deviceButtonRef.current && deviceButtonRef.current.contains(target)) return;
      setShowDevices(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDevices(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDevices]);

  useEffect(() => {
    if (!chatTextContainerRef.current) return;
    if (!pushTalkRef.current) return;
    if (!deviceButtonRef.current) return;

    const pushTalk = pushTalkRef.current.getBoundingClientRect();

    setTogglePosition({ top: chatTextContainerRef.current.getBoundingClientRect().top - 15, left: pushTalk.left - (((deviceButtonRef.current?.clientWidth || 0) - pushTalk.width) / 2) });

  }, [chatTextContainerRef.current, pushTalkRef.current, deviceButtonRef.current]);

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

  // cleanup is handled by the hook

  // Floating widget toggle button
  if (!open) {
    return (
      <button className={styles.ToggleButton} onClick={() => setOpen(true)} title="Chat with Chef">
        <span role="img" aria-label="chef">👨‍🍳</span>
      </button>
    );
  }


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
      {!isRecording &&
        <button

          className={styles.DeviceToggle}
          style={{ position: 'fixed', zIndex: 50000, ...togglePosition }}
          aria-haspopup="true"
          aria-expanded={Boolean(false)}
          onClick={(e) => {
            e.stopPropagation();
            refreshInputDevices();
            setShowDevices((s) => !s);
          }}
          ref={(el) => { deviceButtonRef.current = el; }}
        >
          <FaChevronUp />
        </button>
      }


      {/* Device selector popover */}
      <div style={{ position: 'relative' }}>
        {showDevices && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Audio input settings"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 'calc(100% + 8px)',
              width: 320,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
              zIndex: 1200,
              cursor: 'pointer',
            }}
          >
            <ul className={styles["list-group"]}>
              {inputDevices && inputDevices.map((d) => (
                <li
                  onClick={() => { setSelectedDeviceId(d.deviceId || undefined); setShowDevices(false); }}
                  className={classNames(styles["list-group-item"], { [styles["active"]]: d.deviceId === selectedDeviceId })} key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.InputGroup}
        style={{ height: (containerHeight), maxHeight: maxInputHeight }}
        ref={chatTextContainerRef}
      >
        <textarea
          rows={1}
          className={styles.Input}
          placeholder="What do you want to prepare?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          ref={inputRef}
          style={{ maxHeight: maxInputHeight, height: 22, minHeight: 22 }}
        />
        <div className={styles.Buttons}>
          {
            user &&
            <button
              ref={pushTalkRef}
              className={classNames(styles.SpeechButton, { [styles.Active]: isRecording })}
              onClick={() => toggle().catch((e) => console.error("toggle failed", e))}
              disabled={loading}
              aria-label={isRecording ? "Stop recording" : "Listen"}
              title={isRecording ? "Stop" : "Push to talk"}
            >
              {isRecording ? <FaStop /> : <FaMicrophone />}
            </button>
          }
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

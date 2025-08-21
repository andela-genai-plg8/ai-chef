import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import useChat from "@/hooks/useChat";
import styles from "./Styles.module.scss";
import ReactMarkdown from "react-markdown";
import { useRecipes } from "@/hooks/useRecipes";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";

type ChatMessageProps = {
  msg: { content: string; role: string };
  className?: string;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ msg, className }) => {
  return (
    <div className={classNames(className)}>
      <ReactMarkdown>{msg.content}</ReactMarkdown>
    </div>
  );
};

const Chat = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [maxInputHeight, setMaxInputHeight] = useState<number>(150);
  const navigate = useNavigate();

  const messages = useChat((state) => state.messages);
  const searchedRecipes = useRecipes((state) => state.searchedRecipes);
  const currentModel = useChat((state) => state.currentModel);
  const setCurrentModel = useChat((state) => state.setCurrentModel);
  const supportedModels = useChat((state) => state.supportedModels);
  const sendMessage = useChat((state) => state.sendMessage);
  const addMessage = useChat((state) => state.addMessage);

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

  // Adjust when messages change (container height might change)
  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;
    const h = container.clientHeight || 0;
    setMaxInputHeight(Math.max(80, Math.floor(h * 0.3)));
  }, [messages]);

  const handleSend = async () => {
    setLoading(true);
    if (!input.trim()) {
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
    if (open && messages.length === 0) {
      addMessage({ role: "initial", content: "Hello" });
      sendMessage();
    }
  }, [supportedModels, messages.length, sendMessage, addMessage, open]);

  // auto-resize textarea up to maxInputHeight
  const adjustTextareaHeight = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    // determine a reasonable minimum height in px (match CSS --min-input-h)
    const minInputH = 38; // matches SCSS --min-input-h fallback
    const scrollH = ta.scrollHeight || minInputH;
    const clamped = Math.min(Math.max(scrollH, minInputH), maxInputHeight);
    ta.style.height = `${clamped}px`;
  };

  // adjust whenever input or maxInputHeight changes
  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [input, maxInputHeight]);

  // Multiline input: Enter inserts newline; Enter without shift sends (matches previous behavior)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderModelDropdown = useMemo(() => {
    if (!supportedModels || Object.keys(supportedModels).length === 0) {
      return <option value="gpt-gpt-4o">GPT 4 - Omni</option>;
    }
    return Object.entries(supportedModels).map(([groupKey, group]) => {
      // Type assertion for group
      const typedGroup = group as { title: string; models: Record<string, any> };
      return (
        <optgroup key={groupKey} label={typedGroup.title}>
          {Object.keys(typedGroup.models).map((modelKey) => {
            const model = typedGroup.models[modelKey];
            return (
              <option key={model.id || model.value || model.title} value={modelKey}>
                {model.title}
              </option>
            );
          })}
        </optgroup>
      );
    });
  }, [supportedModels]);

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

  return (
    <div className={styles.Chat}>
      <div className={styles.Header}>
        <h5>Chef</h5>
        <button
          className={styles.CloseButton}
          onClick={() => setOpen(false)}
          title="Close"
        >
          ×
        </button>
      </div>
      <div className={styles.ModelDropdown}>
        <select
          className={styles.FormSelect}
          value={currentModel}
          onChange={(e) => setCurrentModel(e.target.value)}
        >
          {renderModelDropdown}
        </select>
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
        style={{ height: `${maxInputHeight}px` }}>
        <textarea
          rows={1}
          className={styles.Input}
          placeholder="Ask a question"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          ref={inputRef}
          style={{ maxHeight: `${maxInputHeight}px` }}
        />
        <button
          className={styles.SendButton}
          onClick={handleSend}
          disabled={!input.trim() || loading}
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
  );
};

export default Chat;
// Renamed from Chat.jsx to Chat.tsx

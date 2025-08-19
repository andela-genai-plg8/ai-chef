import React, { useState, useRef, useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import useChat from "@/hooks/useChat";
import styles from "./Styles.module.scss";

const Chat = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useChat((state) => state.messages);
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

  const handleSend = async () => {
    setLoading(true);
    addMessage({ sender: "user", content: input });
    await sendMessage();
    setInput("");
    setLoading(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      addMessage({ sender: "initial", content: "Hello" });
      sendMessage();
    }
  }, [supportedModels, messages.length, sendMessage, addMessage, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
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
      <div className="d-flex justify-content-between align-items-center px-3 pt-3 pb-1">
        <h5 className="mb-0">Chef</h5>
        <button
          className={styles.CloseButton}
          onClick={() => setOpen(false)}
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="mb-2 px-3">
        <select
          className="form-select form-select-sm"
          value={currentModel}
          onChange={(e) => setCurrentModel(e.target.value)}
        >
          {renderModelDropdown}
        </select>
      </div>
      <div
        className="flex-grow-1 d-flex flex-column border rounded p-2 mb-2 bg-light"
        style={{ minHeight: 200, maxHeight: 300, overflowY: "auto", overflowX: "hidden" }}
      >
        {messages
          .filter((msg) => msg.sender !== "initial")
          .map((msg, i) => (
            <div
              key={i}
              className={`mb-2 text-start text-${msg.sender === "user" ? "end" : "start"}`}
              style={{ maxWidth: "70%" }}
            >
              <span
                className={`badge bg-${msg.sender === "user" ? "primary" : "secondary"} text-break"`}
                style={{
                  display: "inline-block",
                  maxWidth: "90%",
                  wordBreak: "break-word",
                  whiteSpace: "pre-line",
                }}
              >
                {msg.content}
              </span>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-group px-3 pb-3">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          ref={inputRef}
        />
        <button className="btn btn-success btn-sm" onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chat;
// Renamed from Chat.jsx to Chat.tsx

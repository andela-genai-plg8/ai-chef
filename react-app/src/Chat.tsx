import React, { useState, useRef, useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import useChatStore from "@utils/useChatStore";

const widgetStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 9999,
  maxWidth: 400,
  width: "100%",
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  borderRadius: 16,
  background: "#fff",
};

const toggleBtnStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 10000,
  borderRadius: "50%",
  width: 56,
  height: 56,
  background: "#198754",
  color: "#fff",
  border: "none",
  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  cursor: "pointer",
};

const Chat = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useChatStore((state) => state.messages);
  const currentModel = useChatStore((state) => state.currentModel);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);
  const supportedModels = useChatStore((state) => state.supportedModels);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const addMessage = useChatStore((state) => state.addMessage);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    setLoading(true);
    addMessage({ sender: "user", text: input });
    await sendMessage();
    setInput("");
    setLoading(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (open && messages.length === 0) {
      addMessage({ sender: "initial", text: "Hello" });
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
      <button style={toggleBtnStyle} onClick={() => setOpen(true)} title="Chat with Chef">
        <span role="img" aria-label="chef">👨‍🍳</span>
      </button>
    );
  }

  return (
    <div style={widgetStyle}>
      <div className="d-flex justify-content-between align-items-center px-3 pt-3 pb-1">
        <h5 className="mb-0">Chef</h5>
        <button
          className="btn btn-sm btn-outline-secondary"
          style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, fontSize: 20 }}
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
                {msg.text}
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

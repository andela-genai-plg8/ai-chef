import React, { useState, useRef, useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import useChatStore from "./utils/useChatStore";

const CONTEXT_WINDOW_SIZE = 10;

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const messagesEndRef = useRef(null);

  const supportedModels = useChatStore((state) => state.supportedModels);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  console.log(supportedModels);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: "user", text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setInput("");
    try {
      const contextWindow = newMessages.slice(-CONTEXT_WINDOW_SIZE);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, context: contextWindow, model: selectedModel }),
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { sender: "assistant", text: data.output || data.error }]);
    } catch (err) {
      setMessages((msgs) => [...msgs, { sender: "assistant", text: "Error: " + err.message }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // Memoize model dropdown rendering
  const renderModelDropdown = useMemo(() => {
    if (!supportedModels || Object.keys(supportedModels).length === 0) {
      return <option value="gpt-4o">gpt-4o</option>;
    }
    return Object.entries(supportedModels).map(([groupKey, group]) => (
      <optgroup key={groupKey} label={group.title}>
        {Object.keys(group.models).map((modelKey) => {
          const model = group.models[modelKey];

          return (
            <option key={model.id || model.value || model.title} value={model.id || model.value || model.title}>
              {model.title}
            </option>
          );
        })}
      </optgroup>
    ));
  }, [supportedModels]);

  return (
    <div className="container py-4 d-flex flex-column align-items-center" style={{ maxWidth: 600, width: 600 }}>
      <h2 className="mb-4">Food Central</h2>
      <div className="mb-3 w-100">
        <select className="form-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
          {renderModelDropdown}
        </select>
      </div>
      <div
        className="flex-grow-1 w-100 d-flex flex-column border rounded p-3 mb-3 bg-light"
        style={{ minHeight: 350, maxHeight: "60vh", overflowY: "auto", overflowX: "hidden" }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-2 text-start text-${msg.sender === "user" ? "end" : "start"}`}
            style={{
              maxWidth: "70%",
            }}
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
      <div className="input-group w-100">
        <input
          type="text"
          className="form-control"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="btn btn-success" onClick={sendMessage} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chat;

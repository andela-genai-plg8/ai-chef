import React, { useState, useRef, useEffect, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import useChatStore from "./utils/useChatStore";

const Chat = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = useChatStore((state) => state.messages);
  const setCurrentModel = useChatStore((state) => state.setCurrentModel);
  const supportedModels = useChatStore((state) => state.supportedModels);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const addMessage = useChatStore((state) => state.addMessage);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    setCurrentModel(selectedModel);
  }, [selectedModel, setCurrentModel]);

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

  // send a blank message in a useeffect
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({ sender: "initial", text: "Hello" });
      sendMessage();
    }
  }, [supportedModels, messages.length, sendMessage, addMessage]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
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
        <select
          className="form-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {renderModelDropdown}
        </select>
      </div>
      <div
        className="flex-grow-1 w-100 d-flex flex-column border rounded p-3 mb-3 bg-light"
        style={{ minHeight: 350, maxHeight: "60vh", overflowY: "auto", overflowX: "hidden" }}
      >
        {messages
          .filter((msg) => msg.sender !== "initial")
          .map((msg, i) => (
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
          ref={inputRef}
        />
        <button className="btn btn-success" onClick={handleSend} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chat;

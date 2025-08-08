import React, { useState, useRef, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const CONTEXT_WINDOW_SIZE = 10;

const Chat = () => {
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
        body: JSON.stringify({ prompt: input, context: contextWindow })
      });
      const data = await res.json();
      setMessages((msgs) => [...msgs, { sender: "ai", text: data.output || data.error }]);
    } catch (err) {
      setMessages((msgs) => [...msgs, { sender: "ai", text: "Error: " + err.message }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="container py-4 d-flex flex-column align-items-center" style={{ maxWidth: 600, width: 600 }}>
      <h2 className="mb-4">AI Chat</h2>
      <div className="flex-grow-1 w-100 d-flex flex-column border rounded p-3 mb-3 bg-light" style={{ minHeight: 350, maxHeight: "60vh", overflowY: "auto", overflowX: "hidden" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 text-${msg.sender === "user" ? "end" : "start"}`}> 
            <span 
              className={`badge bg-${msg.sender === "user" ? "primary" : "secondary"} text-break`} 
              style={{
                display: "inline-block",
                maxWidth: "90%",
                wordBreak: "break-word",
                whiteSpace: "pre-line"
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

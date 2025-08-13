import React, { useEffect } from "react";
import Chat from "./Chat";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";
import useChatStore from "./utils/useChatStore";

function App() {
  useEffect(() => {
    // Fetch supported models when the app loads
    useChatStore.getState().getSupportedModels();
  }, []);

  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw" }}>
      {/* Sidebar */}
      <nav className="bg-dark text-white d-flex flex-column align-items-center py-4" style={{ width: 70, minWidth: 70, maxWidth: 70, height: "100vh" }}>
        <div className="mb-4">
          <span className="fs-4 fw-bold">KI</span>
        </div>
        <ul className="nav nav-pills flex-column mb-auto w-100 text-center">
          <li className="nav-item mb-3">
            <a href="#" className="nav-link text-white" aria-current="page">
              <i className="bi bi-chat-dots"></i>
            </a>
          </li>
          <li className="nav-item mb-3">
            <a href="#" className="nav-link text-white" aria-current="page">
              <i className="bi bi-fork-knife"></i>
            </a>
          </li>
          <li className="nav-item mb-3">
            <a href="#" className="nav-link text-white">
              <i className="bi bi-gear"></i>
            </a>
          </li>
        </ul>
      </nav>
      {/* Main Content */}
      <main className="flex-grow-1 d-flex align-items-center justify-content-center bg-light" style={{ minHeight: "100vh", width: "calc(100vw - 70px)" }}>
        <Chat />
      </main>
    </div>
  );
}

  export default App;
// Renamed from App.jsx to App.tsx

import React, { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Chat from "./components/Chat/Chat";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

import "@/firebase";
import useChatStore from "@utils/useChat";
import Home from "@/pages/Home/Home";
import RecipePage from "@/pages/RecipePage/RecipePage";
import Login from "@/pages/Login/Login";
import AllRecipes from "./pages/AllRecipes/AllRecipes";

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
            <Link to="/" className="nav-link text-white" aria-current="page">
              <i className="bi bi-chat-dots"></i>
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link to="/recipes" className="nav-link text-white" aria-current="page">
              <i className="bi bi-fork-knife"></i>
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link to="/settings" className="nav-link text-white">
              <i className="bi bi-gear"></i>
            </Link>
          </li>
        </ul>
      </nav>
      {/* Main Content */}
      <main className="flex-grow-1 d-flex align-items-start justify-content-center bg-light" style={{ minHeight: "100vh", width: "calc(100vw - 70px)" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recipes" element={<AllRecipes />} />
          <Route path="/recipe/:id" element={<RecipePage />} />
          <Route path="/settings" element={<div>Settings page coming soon!</div>} />
        </Routes>
      </main>
      <Chat />
    </div>
  );
}

export default App;
// Renamed from App.jsx to App.tsx

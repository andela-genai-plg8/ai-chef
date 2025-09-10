import React, { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Chat from "./components/Chat/Chat";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

import "@/firebase";
import useChat from "@/hooks/useChat";
import Home from "@/pages/Home/Home";
import RecipePage from "@/pages/RecipePage/RecipePage";
import Login from "@/pages/Login/Login";
import AllRecipes from "@/pages/AllRecipes/AllRecipes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import RestaurantPage from "@/pages/Restaurant/RestaurantPage";
import RecipeResults from "@/pages/RecipeResults/RecipeResults";
import RecipeAdd from "@/pages/RecipeAdd/RecipeAdd";
import { useAppState } from "@/hooks/useAppState";

function App() {
  // load the dictionary
  const { loadWords } = useAppState();

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw" }}>
      {/* Sidebar */}
      <nav className="bg-dark text-white d-flex flex-column align-items-center py-4" style={{ width: 70, minWidth: 70, maxWidth: 70, height: "100vh" }}>

        <ul className="nav nav-pills flex-column mb-auto w-100 text-center">
          <li className="nav-item mb-3">
            <Link to="/" className="nav-link text-white" aria-current="page">
              <i className="bi bi-house"></i>
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link to="/recipes" className="nav-link text-white" aria-current="page">
              <i className="bi bi-fork-knife"></i>
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link to="/recipe_add" className="nav-link text-white" aria-current="page" title="Add recipe">
              <i className="bi bi-file-earmark-plus"></i>
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
          <Route path="/recipe_add" element={<RecipeAdd />} />
          <Route path="/recipes/search" element={<RecipeResults />} />
          <Route path="/recipe/:slug" element={<RecipePage />} />
          <Route path="/recipes/:slug" element={<RecipePage />} />
          <Route path="/restaurant/:slug" element={<ProtectedRoute><RestaurantPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div>Settings page coming soon!</div></ProtectedRoute>} />
        </Routes>
      </main>
      <Chat />
    </div>
  );
}

export default App;

import React, { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Chat from "./components/Chat/Chat";
// Import the project's SCSS which includes Bootstrap with our variable overrides
import "@/index.module.scss";
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
import Sidebar from "@/components/Sidebar/Sidebar";

function App() {
  // load the dictionary
  const { loadWords } = useAppState();

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return (
    <div className="d-flex" style={{ minHeight: "100vh", width: "100vw" }}>
      {/* Sidebar */}
      <Sidebar />
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

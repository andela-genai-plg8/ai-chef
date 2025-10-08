import React, { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Chat from "./components/Chat/Chat";
// Import the project's SCSS which includes Bootstrap with our variable overrides
import styles from "@/index.module.scss";
import "./App.css";

import "@/firebase";
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
import NotFound from "./pages/NotFound/NotFound";

function App() {
  // load the dictionary
  const { loadWords } = useAppState();
  const [sidebarWidth, setSidebarWidth] = useState<number>(70); // default matching CSS

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return (
    <div className={styles.App} style={{ minHeight: "100vh", width: "100vw" }}>
  {/* Sidebar */}
  <Sidebar className={styles.Sidebar} onWidthChange={(w) => setSidebarWidth(w)} />
      {/* Main Content */}
  <main className={styles.MainContent} style={{ minHeight: '100vh', width: `calc(100vw - ${sidebarWidth}px)` }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recipes" element={<AllRecipes />} />
          <Route path="/recipes/new" element={<ProtectedRoute><RecipeAdd /></ProtectedRoute>} />
          <Route path="/recipes/search" element={<RecipeResults />} />
          <Route path="/my/recipes" element={<ProtectedRoute><AllRecipes personal /></ProtectedRoute>} />
          <Route path="/my/recipe/:slug" element={<ProtectedRoute><RecipePage personal /></ProtectedRoute>} />
          <Route path="/my/recipe/:slug/edit" element={<ProtectedRoute><RecipePage edit personal /></ProtectedRoute>} />
          <Route path="/recipe/:slug" element={<RecipePage />} />
          <Route path="/recipe/:slug/edit" element={<ProtectedRoute><RecipePage edit /></ProtectedRoute>} />
          <Route path="/recipes/:slug" element={<RecipePage />} />
          <Route path="/restaurant/:slug" element={<ProtectedRoute><RestaurantPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div>Settings page coming soon!</div></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Chat />
    </div>
  );
}

export default App;

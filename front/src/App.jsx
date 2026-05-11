import { useState } from "react";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import DataIngestionPage from "./pages/DataIngestionPage";
import PipelinesPage from "./pages/PipelinesPage";
import CatalogPage from "./pages/CatalogPage";
import AdminPage from "./pages/AdminPage";
import "./styles/global.css";

export default function App() {
  const [activePage, setActivePage] = useState("home");

  const renderPage = () => {
    switch (activePage) {
      case "home":
        return <HomePage onNavigate={setActivePage} />;
      case "data-ingestion":
        return <DataIngestionPage />;
      case "pipelines":
        return <PipelinesPage />;
      case "catalog":
        return <CatalogPage />;
      case "admin":
        return <AdminPage />;
      default:
        return <HomePage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

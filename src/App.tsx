import { useEffect, useState } from "react";
import { api } from "./api";
import AdminApp from "./admin/AdminApp";
import PublicSite from "./public/PublicSite";
import type { SiteData } from "./types";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleHistory = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  useEffect(() => {
    if (path === "/admin" || path.startsWith("/admin/")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<SiteData>(path === "/preview" ? "/api/admin/preview" : "/api/public/site")
      .then(setSite)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [path]);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (path === "/admin" || path.startsWith("/admin/")) {
    return <AdminApp onNavigate={navigate} />;
  }
  if (loading) return <div className="loading-screen"><span className="spinner" /> Loading portfolio</div>;
  if (error || !site) return <div className="error-screen"><h1>We couldn't load this portfolio.</h1><p>{error}</p></div>;
  return <PublicSite site={site} onNavigate={navigate} path={path === "/preview" ? "/" : path} isPreview={path === "/preview"} />;
}

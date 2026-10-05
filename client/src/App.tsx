import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ResetPassword from "@/pages/ResetPassword";
import { usePreferences } from "@/store/preferencesStore";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function useSystemDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return dark;
}

function App() {
  const { motion, theme } = usePreferences();
  const systemDark = useSystemDark();
  const night = theme === "night" || (theme === "system" && systemDark);

  // Classes on <html> so plain CSS (scene animations, dark: variants) can react too
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", night);
    root.classList.toggle("reduce-motion", motion === "reduced");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", night ? "#0b1d3a" : "#1a6fc4");
  }, [night, motion]);

  return (
    // "user" follows the OS setting; the in-app switch forces it on
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>
      <Router />
      <Toaster />
    </MotionConfig>
  );
}

export default App;

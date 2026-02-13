"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        // Silent fail: SW isn't critical for core app function yet
        console.warn("Service worker registration failed:", err);
      }
    };

    register();
  }, []);

  return null;
}

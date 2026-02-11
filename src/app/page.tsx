"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/today");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/today");
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. You can sign in now.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setMsg(e.message ?? "Something blew up. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-semibold">Habit Chaos</h1>
        <p className="text-sm text-gray-600 mt-1">
          Email + password. Checkbox-only. No excuses.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            className={`px-3 py-2 rounded-lg border ${
              mode === "signin" ? "bg-gray-900 text-white" : ""
            }`}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Sign in
          </button>
          <button
            className={`px-3 py-2 rounded-lg border ${
              mode === "signup" ? "bg-gray-900 text-white" : ""
            }`}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Sign up
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-lg border p-3"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            className="w-full rounded-lg bg-gray-900 text-white p-3 disabled:opacity-60"
            onClick={submit}
            disabled={busy || !email || !password}
          >
            {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          {msg && <p className="text-sm text-gray-700">{msg}</p>}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { todayInNY } from "@/lib/day";

type Habit = { id: string; name: string; sort_order: number };

export default function TodayPage() {
  const router = useRouter();
  const day = useMemo(() => todayInNY(), []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/");
        return;
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setBusy(true);
    try {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      const userId = userData.user.id;

      const { data: h, error: herr } = await supabase
        .from("habits")
        .select("id,name,sort_order")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (herr) throw herr;

      const habitIds = (h ?? []).map((x) => x.id);
      let map: Record<string, boolean> = {};

      if (habitIds.length) {
        const { data: c, error: cerr } = await supabase
          .from("habit_checks")
          .select("habit_id")
          .eq("user_id", userId)
          .eq("day", day)
          .in("habit_id", habitIds);

        if (cerr) throw cerr;

        (c ?? []).forEach((row: any) => {
          map[row.habit_id] = true;
        });
      }

      setHabits(h ?? []);
      setChecked(map);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(habitId: string) {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user.id;

      const next = !checked[habitId];

      if (next) {
        const { error } = await supabase.from("habit_checks").upsert(
          { user_id: userId, habit_id: habitId, day },
          { onConflict: "user_id,habit_id,day" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_checks")
          .delete()
          .eq("user_id", userId)
          .eq("habit_id", habitId)
          .eq("day", day);
        if (error) throw error;
      }

      setChecked((prev) => ({ ...prev, [habitId]: next }));
    } catch {
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const done = habits.filter((h) => checked[h.id]).length;

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Today</h1>
          <p className="text-gray-600 mt-1">
            {day} • {done}/{habits.length} done
          </p>
        </div>
        <button className="rounded-lg border px-3 py-2" onClick={signOut}>
          Sign out
        </button>
      </header>

      <section className="mt-6 space-y-3">
        {habits.map((h) => {
          const isOn = !!checked[h.id];
          return (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              disabled={busy}
              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm disabled:opacity-60
                ${isOn ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              <span className="font-medium">{h.name}</span>
              <span className="text-sm">{isOn ? "✅" : "⬜"}</span>
            </button>
          );
        })}

        {!habits.length && (
          <div className="rounded-2xl border p-4 bg-white">
            No habits found yet. (Seeded habits should appear here.)
          </div>
        )}
      </section>
    </main>
  );
}

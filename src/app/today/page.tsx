"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { todayInNY, addDays } from "@/lib/day";

type Habit = { id: string; name: string; sort_order: number };

function calcStreak(days: Set<string>, anchorDay: string): number {
  // Count consecutive days ending at anchorDay (anchorDay included if present)
  let streak = 0;
  let d = anchorDay;

  while (days.has(d)) {
    streak += 1;
    d = addDays(d, -1);
  }

  return streak;
}

export default function TodayPage() {
  const router = useRouter();
  const today = useMemo(() => todayInNY(), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkedToday, setCheckedToday] = useState<Record<string, boolean>>({});
  const [daysByHabit, setDaysByHabit] = useState<Record<string, Set<string>>>({});
  const [streaks, setStreaks] = useState<Record<string, number>>({});
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
      const user = userData.user;
      if (!user) {
        router.replace("/");
        return;
      }
      const userId = user.id;

      // 90-day window is plenty for streaks; adjust later if you want
      const startDay = addDays(today, -90);

      const { data: h, error: herr } = await supabase
        .from("habits")
        .select("id,name,sort_order")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (herr) throw herr;

      const habitIds = (h ?? []).map((x) => x.id);

      // Pull checks for the last 90 days for streak computation
      let checks: { habit_id: string; day: string }[] = [];
      if (habitIds.length) {
        const { data: c, error: cerr } = await supabase
          .from("habit_checks")
          .select("habit_id,day")
          .eq("user_id", userId)
          .gte("day", startDay)
          .in("habit_id", habitIds);

        if (cerr) throw cerr;
        checks = (c ?? []) as any;
      }

      // Build sets of days per habit + today's checked map
      const byHabit: Record<string, Set<string>> = {};
      const checkedMap: Record<string, boolean> = {};

      for (const id of habitIds) byHabit[id] = new Set();

      for (const row of checks) {
        if (!byHabit[row.habit_id]) byHabit[row.habit_id] = new Set();
        byHabit[row.habit_id].add(row.day);
        if (row.day === today) checkedMap[row.habit_id] = true;
      }

      // Compute streaks:
      // - If checked today: streak ending today
      // - If not checked today: streak ending yesterday (so you see your “current” streak before completing today)
      const streakMap: Record<string, number> = {};
      for (const id of habitIds) {
        const days = byHabit[id] ?? new Set<string>();
        const anchor = checkedMap[id] ? today : yesterday;
        streakMap[id] = calcStreak(days, anchor);
      }

      setHabits(h ?? []);
      setCheckedToday(checkedMap);
      setDaysByHabit(byHabit);
      setStreaks(streakMap);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(habitId: string) {
    setBusy(true);
    try {
      const { data: userData, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      const user = userData.user;
      if (!user) {
        router.replace("/");
        return;
      }
      const userId = user.id;

      const next = !checkedToday[habitId];

      if (next) {
        const { error } = await supabase.from("habit_checks").upsert(
          { user_id: userId, habit_id: habitId, day: today },
          { onConflict: "user_id,habit_id,day" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_checks")
          .delete()
          .eq("user_id", userId)
          .eq("habit_id", habitId)
          .eq("day", today);
        if (error) throw error;
      }

      // Update local state (no full reload)
      setCheckedToday((prev) => ({ ...prev, [habitId]: next }));

      setDaysByHabit((prev) => {
        const copy: Record<string, Set<string>> = { ...prev };
        const set = new Set(copy[habitId] ?? []);
        if (next) set.add(today);
        else set.delete(today);
        copy[habitId] = set;

        // Recompute streak for this habit
        const anchor = next ? today : yesterday;
        setStreaks((sPrev) => ({ ...sPrev, [habitId]: calcStreak(set, anchor) }));

        return copy;
      });
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

  const done = habits.filter((h) => checkedToday[h.id]).length;

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Today</h1>
          <p className="text-gray-600 mt-1">
            {today} • {done}/{habits.length} done
          </p>
        </div>
        <button className="rounded-lg border px-3 py-2" onClick={signOut}>
          Sign out
        </button>
      </header>

      <section className="mt-6 space-y-3">
        {habits.map((h) => {
          const isOn = !!checkedToday[h.id];
          const streak = streaks[h.id] ?? 0;

          return (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              disabled={busy}
              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left shadow-sm disabled:opacity-60
                ${isOn ? "bg-gray-900 text-white" : "bg-white"}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{h.name}</span>
                <span className={`text-sm ${isOn ? "text-white/80" : "text-gray-600"}`}>
                  🔥 {streak}
                </span>
              </div>
              <span className="text-sm">{isOn ? "✅" : "⬜"}</span>
            </button>
          );
        })}

        {!habits.length && (
          <div className="rounded-2xl border p-4 bg-white">
            No habits found yet.
          </div>
        )}
      </section>
    </main>
  );
}

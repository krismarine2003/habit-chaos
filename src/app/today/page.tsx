"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { todayInNY, addDays } from "@/lib/day";

type Habit = { id: string; name: string; sort_order: number | null; user_id?: string | null };

function calcStreak(days: Set<string>, anchorDay: string): number {
  let streak = 0;
  let d = anchorDay;
  while (days.has(d)) {
    streak += 1;
    d = addDays(d, -1);
  }
  return streak;
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function TodayPage() {
  const searchParams = useSearchParams();

  const nyToday = useMemo(() => todayInNY(), []);
  const dateParam = searchParams.get("date") ?? "";
  const day = useMemo(() => (isISODate(dateParam) ? dateParam : nyToday), [dateParam, nyToday]);
  const yesterday = useMemo(() => addDays(day, -1), [day]);

  const monthlyHref = useMemo(() => `/monthly?month=${day.slice(0, 7)}`, [day]);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkedToday, setCheckedToday] = useState<Record<string, boolean>>({});
  const [daysByHabit, setDaysByHabit] = useState<Record<string, Set<string>>>({});
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [writeUserId, setWriteUserId] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function getAuthUserId(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user?.id ?? null;
    } catch {
      return null;
    }
  }

  async function load() {
    setBusy(true);

    try {
      const authUserId = await getAuthUserId();
      const startDay = addDays(day, -90);

      const { data: h, error: herr } = await supabase
        .from("habits")
        .select("id,name,sort_order,user_id,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (herr) throw herr;

      const habitList = ((h ?? []) as any as Habit[]).map((x: any) => ({
        id: x.id,
        name: x.name,
        sort_order: x.sort_order ?? null,
        user_id: x.user_id ?? null,
      }));

      const inferredFromHabits = habitList.find((x) => x.user_id)?.user_id ?? null;
      const effectiveUserId = authUserId ?? inferredFromHabits;
      setWriteUserId(effectiveUserId);

      const habitIds = habitList.map((x) => x.id);

      let checks: { habit_id: string; day: string; user_id?: string | null }[] = [];
      if (habitIds.length) {
        let q = supabase
          .from("habit_checks")
          .select("habit_id,day,user_id")
          .gte("day", startDay)
          .in("habit_id", habitIds);

        if (effectiveUserId) q = q.eq("user_id", effectiveUserId);

        const { data: c, error: cerr } = await q;
        if (cerr) throw cerr;
        checks = (c ?? []) as any;
      }

      const byHabit: Record<string, Set<string>> = {};
      const checkedMap: Record<string, boolean> = {};

      for (const id of habitIds) byHabit[id] = new Set();

      for (const row of checks) {
        const dayKey = (row.day ?? "").slice(0, 10);
        if (!dayKey) continue;

        if (!byHabit[row.habit_id]) byHabit[row.habit_id] = new Set();
        byHabit[row.habit_id].add(dayKey);

        if (dayKey === day) checkedMap[row.habit_id] = true;
      }

      const streakMap: Record<string, number> = {};
      for (const id of habitIds) {
        const daysSet = byHabit[id] ?? new Set<string>();
        const anchor = checkedMap[id] ? day : yesterday;
        streakMap[id] = calcStreak(daysSet, anchor);
      }

      setHabits(habitList);
      setCheckedToday(checkedMap);
      setDaysByHabit(byHabit);
      setStreaks(streakMap);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong loading today.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(habitId: string) {
    setBusy(true);

    try {
      const next = !checkedToday[habitId];

      if (next) {
        const payload: any = { habit_id: habitId, day };
        if (writeUserId) payload.user_id = writeUserId;

        const { error } = await supabase.from("habit_checks").insert(payload);
        if (error) throw error;
      } else {
        let del = supabase.from("habit_checks").delete().eq("habit_id", habitId).eq("day", day);
        if (writeUserId) del = del.eq("user_id", writeUserId);

        const { error } = await del;
        if (error) throw error;
      }

      setCheckedToday((prev) => ({ ...prev, [habitId]: next }));

      setDaysByHabit((prev) => {
        const copy: Record<string, Set<string>> = { ...prev };
        const set = new Set(copy[habitId] ?? []);
        if (next) set.add(day);
        else set.delete(day);
        copy[habitId] = set;

        const anchor = next ? day : yesterday;
        setStreaks((sPrev) => ({ ...sPrev, [habitId]: calcStreak(set, anchor) }));

        return copy;
      });

      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Toggle failed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const done = habits.filter((h) => checkedToday[h.id]).length;
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={monthlyHref} className="text-sm font-medium text-gray-700 hover:text-gray-900">
            ← Monthly
          </Link>
          <div className="text-sm text-gray-600">Habit Tracker</div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Hero card */}
        <div className="rounded-3xl border bg-white shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
              <p className="text-sm text-gray-600 mt-1">{day}</p>
            </div>

            <div className="rounded-2xl border bg-gray-50 px-3 py-2 text-right">
              <div className="text-sm font-semibold">
                {done}/{habits.length}
              </div>
              <div className="text-xs text-gray-600">{pct}%</div>
            </div>
          </div>

          {err && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="mt-4 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gray-900"
              style={{ width: `${pct}%`, transition: "width 250ms ease" }}
            />
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Tap habits to mark complete. Streak updates instantly.
          </p>
        </div>

        {/* Habit list */}
        <div className="mt-5 space-y-3">
          {habits.map((h) => {
            const isOn = !!checkedToday[h.id];
            const streak = streaks[h.id] ?? 0;

            return (
              <button
                key={h.id}
                onClick={() => toggle(h.id)}
                disabled={busy}
                className={[
                  "w-full rounded-3xl border p-4 text-left shadow-sm transition",
                  "hover:shadow-md hover:-translate-y-[1px] active:translate-y-0",
                  "disabled:opacity-60 disabled:hover:shadow-sm",
                  isOn ? "bg-gray-900 text-white border-gray-900" : "bg-white",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold truncate">{h.name}</span>
                      {isOn && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/15">
                          Done
                        </span>
                      )}
                    </div>
                    <div className={["mt-1 text-sm", isOn ? "text-white/80" : "text-gray-600"].join(" ")}>
                      🔥 Streak: {streak}
                    </div>
                  </div>

                  <div
                    className={[
                      "shrink-0 w-10 h-10 rounded-2xl border flex items-center justify-center text-lg",
                      isOn ? "border-white/20 bg-white/10" : "bg-gray-50",
                    ].join(" ")}
                  >
                    {isOn ? "✅" : "⬜"}
                  </div>
                </div>
              </button>
            );
          })}

          {!habits.length && (
            <div className="rounded-3xl border bg-white p-5 text-gray-700 shadow-sm">
              No habits found yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

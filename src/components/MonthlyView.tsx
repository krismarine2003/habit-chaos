"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type HabitCheckRow = {
  id: string;
  user_id: string | null;
  habit_id: string;
  day: string;
  created_at: string;
};

type HabitRow = {
  id: string;
  user_id: string | null;
  name: string;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function buildCalendarDays(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const firstDow = start.getDay(); // 0=Sun
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - firstDow);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  return {
    cells,
    monthIndex: monthDate.getMonth(),
    monthStartISO: toISODate(start),
  };
}

function heatClass(done: number, total: number) {
  if (!total) return "bg-white";
  const pct = done / total;

  if (pct === 0) return "bg-white";
  if (pct < 0.25) return "bg-gray-50";
  if (pct < 0.5) return "bg-gray-100";
  if (pct < 0.75) return "bg-gray-200";
  if (pct < 1) return "bg-gray-300";
  return "bg-gray-900 text-white";
}

export default function MonthlyView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // support /monthly?month=YYYY-MM
  const monthParam = searchParams.get("month") ?? "";
  const initialMonthDate = useMemo(() => {
    if (/^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  }, [monthParam]);

  const [monthDate, setMonthDate] = useState(() => initialMonthDate);
  const [checkRows, setCheckRows] = useState<HabitCheckRow[]>([]);
  const [habitsRows, setHabitsRows] = useState<HabitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cal = useMemo(() => buildCalendarDays(monthDate), [monthDate]);

  const nextMonthStartISO = useMemo(() => {
    return toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
  }, [monthDate]);

  // Keep URL in sync with chosen month (so back/forward + deep links work)
  useEffect(() => {
    const mm = String(monthDate.getMonth() + 1).padStart(2, "0");
    const nextParam = `${monthDate.getFullYear()}-${mm}`;
    if (nextParam !== monthParam) {
      router.replace(`/monthly?month=${nextParam}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDate]);

  const habitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of habitsRows) {
      const idKey = String(h.id).trim().toLowerCase();
      const name = (h.name ?? "").trim();
      if (idKey && name) map.set(idKey, name);
    }
    return map;
  }, [habitsRows]);

  const activeHabits = useMemo(() => {
    const list = habitsRows.filter((h) => h.is_active === true);
    list.sort((a, b) => {
      const ao = a.sort_order ?? 9999;
      const bo = b.sort_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
    return list;
  }, [habitsRows]);

  const checksByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of checkRows) {
      const dayKey = (r.day ?? "").slice(0, 10);
      if (!dayKey) continue;

      if (!map.has(dayKey)) map.set(dayKey, new Set());
      map.get(dayKey)!.add(String(r.habit_id).trim().toLowerCase());
    }
    return map;
  }, [checkRows]);

  // Quick month stats for polish + insight
  const monthStats = useMemo(() => {
    const totalHabits = activeHabits.length;
    if (!totalHabits) {
      return { perfectDays: 0, bestDayISO: null as string | null, bestDone: 0, avgPct: 0 };
    }

    let perfectDays = 0;
    let bestDayISO: string | null = null;
    let bestDone = 0;

    // Only count days that are in the displayed month
    const monthDays = cal.cells
      .filter((d) => d.getMonth() === cal.monthIndex)
      .map((d) => toISODate(d));

    let sumPct = 0;
    let counted = 0;

    for (const iso of monthDays) {
      const done = (checksByDate.get(iso)?.size ?? 0);
      const pct = done / totalHabits;

      sumPct += pct;
      counted += 1;

      if (done === totalHabits) perfectDays += 1;
      if (done > bestDone) {
        bestDone = done;
        bestDayISO = iso;
      }
    }

    const avgPct = counted ? Math.round((sumPct / counted) * 100) : 0;
    return { perfectDays, bestDayISO, bestDone, avgPct };
  }, [activeHabits.length, cal.cells, cal.monthIndex, checksByDate]);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      setLoading(true);
      setErr(null);

      const habitsRes = await supabase
        .from("habits")
        .select("id, user_id, name, is_active, sort_order, created_at")
        .order("sort_order", { ascending: true });

      const checksRes = await supabase
        .from("habit_checks")
        .select("id, user_id, habit_id, day, created_at")
        .gte("day", cal.monthStartISO)
        .lt("day", nextMonthStartISO)
        .order("day", { ascending: true });

      if (!alive) return;

      if (habitsRes.error) {
        setErr(habitsRes.error.message);
        setHabitsRows([]);
        setCheckRows([]);
        setLoading(false);
        return;
      }

      if (checksRes.error) {
        setErr(checksRes.error.message);
        setHabitsRows((habitsRes.data as HabitRow[]) ?? []);
        setCheckRows([]);
        setLoading(false);
        return;
      }

      setHabitsRows((habitsRes.data as HabitRow[]) ?? []);
      setCheckRows((checksRes.data as HabitCheckRow[]) ?? []);
      setLoading(false);
    }

    loadData();
    return () => {
      alive = false;
    };
  }, [cal.monthStartISO, nextMonthStartISO]);

  const monthLabel = useMemo(
    () => monthDate.toLocaleString(undefined, { month: "long", year: "numeric" }),
    [monthDate]
  );

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const todayISO = useMemo(() => toISODate(new Date()), []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Monthly</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Tap a day to edit habits for that date.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 active:scale-[0.99]"
              onClick={() => setMonthDate((d) => addMonths(d, -1))}
              aria-label="Previous month"
            >
              ← <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="rounded-xl border bg-white px-3 py-2 text-sm font-medium shadow-sm">
              {monthLabel}
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 active:scale-[0.99]"
              onClick={() => setMonthDate((d) => addMonths(d, 1))}
              aria-label="Next month"
            >
              <span className="hidden sm:inline">Next</span> →
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Legend + Stats */}
        <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-white shadow-sm px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span className="font-medium text-gray-800">Completion</span>
              <span className="w-4 h-4 rounded-md border bg-white" />
              <span className="w-4 h-4 rounded-md border bg-gray-50" />
              <span className="w-4 h-4 rounded-md border bg-gray-100" />
              <span className="w-4 h-4 rounded-md border bg-gray-200" />
              <span className="w-4 h-4 rounded-md border bg-gray-300" />
              <span className="w-4 h-4 rounded-md border bg-gray-900" />
              <span className="ml-1">0 → 100%</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {loading ? "Loading…" : `Checks: ${checkRows.length} • Active habits: ${activeHabits.length}`}
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm px-4 py-3">
            <div className="text-xs text-gray-600">Average completion</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{monthStats.avgPct}%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-gray-900"
                style={{ width: `${monthStats.avgPct}%`, transition: "width 250ms ease" }}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm px-4 py-3">
            <div className="text-xs text-gray-600">Perfect days</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {monthStats.perfectDays}
              <span className="text-sm font-medium text-gray-500 ml-2">
                {activeHabits.length ? `/ ${cal.cells.filter((d) => d.getMonth() === cal.monthIndex).length}` : ""}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Best day:{" "}
              <span className="font-mono">
                {monthStats.bestDayISO ? `${monthStats.bestDayISO} (${monthStats.bestDone}/${activeHabits.length || 0})` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="px-2 text-[11px] font-semibold text-gray-600">
              {w}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {cal.cells.map((d) => {
            const iso = toISODate(d);
            const inMonth = d.getMonth() === cal.monthIndex;

            const checkedIds = checksByDate.get(iso) ?? new Set<string>();
            const doneCount = checkedIds.size;
            const total = activeHabits.length;

            const heat = heatClass(doneCount, total);
            const dark = heat.includes("text-white");
            const isToday = iso === todayISO;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => router.push(`/today?date=${iso}`)}
                className={[
                  "group rounded-2xl border p-3 min-h-[104px] sm:min-h-[118px] text-left transition",
                  "shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0",
                  "focus:outline-none focus:ring-2 focus:ring-gray-400",
                  inMonth ? heat : "bg-gray-50 opacity-70",
                  isToday ? "ring-2 ring-gray-900 ring-offset-2" : "",
                ].join(" ")}
                aria-label={`Open ${iso}`}
              >
                <div className="flex items-start justify-between">
                  <div className={["text-sm font-semibold", dark ? "text-white" : "text-gray-900"].join(" ")}>
                    {d.getDate()}
                  </div>

                  <div className={["text-xs tabular-nums", dark ? "text-white/80" : "text-gray-600"].join(" ")}>
                    {total ? `${doneCount}/${total}` : "—"}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from(checkedIds)
                    .slice(0, 4)
                    .map((habitId) => {
                      const label = habitNameById.get(habitId) ?? habitId;
                      return (
                        <span
                          key={habitId}
                          title={label}
                          className={[
                            "text-[10px] px-2 py-1 rounded-full border",
                            dark ? "border-white/25 text-white/90" : "border-gray-200 text-gray-700",
                          ].join(" ")}
                        >
                          {label.length > 14 ? label.slice(0, 14) + "…" : label}
                        </span>
                      );
                    })}

                  {checkedIds.size > 4 && (
                    <span
                      className={[
                        "text-[10px] px-2 py-1 rounded-full border opacity-80",
                        dark ? "border-white/25 text-white/90" : "border-gray-200 text-gray-700",
                      ].join(" ")}
                    >
                      +{checkedIds.size - 4}
                    </span>
                  )}
                </div>

                <div
                  className={[
                    "mt-3 text-[11px] opacity-0 group-hover:opacity-100 transition",
                    dark ? "text-white/80" : "text-gray-500",
                  ].join(" ")}
                >
                  Tap to edit
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import MonthlyView from "@/components/MonthlyView";

export default function MonthlyPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading monthly view…</div>}>
      <MonthlyView />
    </Suspense>
  );
}


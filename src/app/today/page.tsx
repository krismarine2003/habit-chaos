import { Suspense } from "react";
import TodayPage from "./TodayPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <TodayPage />
    </Suspense>
  );
}
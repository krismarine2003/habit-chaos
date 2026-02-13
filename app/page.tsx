import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="min-h-screen px-6 pb-28 pt-10">
      <div className="mx-auto w-full max-w-md">
        {/* Brand mark */}
        <div className="flex items-center justify-center">
          <div className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 shadow-sm flex items-center justify-center">
            <span className="text-2xl">✅</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="mt-8 text-center text-4xl font-semibold tracking-tight">
          Welcome
        </h1>

        {/* Subcopy */}
        <p className="mt-3 text-center text-sm leading-6 text-white/70">
          Track the habits that matter. Build streaks. Earn momentum.
          <br />
          Simple by design — powerful in practice.
        </p>

        {/* Feature bullets */}
        <div className="mt-8 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-sm">📅</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Daily clarity</p>
                <p className="mt-1 text-sm text-white/70">
                  One screen. Today’s habits. No clutter.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-sm">🔥</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Streak-driven</p>
                <p className="mt-1 text-sm text-white/70">
                  Consistency beats intensity — we make it visible.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-sm">🔒</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Your data, your progress</p>
                <p className="mt-1 text-sm text-white/70">
                  Built for reliability across devices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* iOS install hint (subtle, optional but helpful) */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/70">
            <span className="font-semibold text-white/80">Tip:</span> On iPhone, install from Safari via{" "}
            <span className="text-white/80">Share</span> →{" "}
            <span className="text-white/80">Add to Home Screen</span>.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-6 left-0 right-0 px-6">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/today"
            className="block w-full rounded-2xl bg-white px-6 py-4 text-center text-sm font-semibold text-black shadow-sm active:scale-[0.99]"
          >
            Start Tracking Now
          </Link>
          <p className="mt-3 text-center text-xs text-white/50">
            No pressure. Just progress.
          </p>
        </div>
      </div>
    </main>
  );
}

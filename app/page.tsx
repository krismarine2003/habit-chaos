import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-semibold">Welcome</h1>
      <p className="mt-3 text-sm opacity-80">
        Simple habits. Real streaks. Let’s build momentum.
      </p>

      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6">
        <Link
          href="/today"
          className="w-full max-w-sm rounded-xl border border-white/20 px-6 py-4 font-semibold"
        >
          Start Tracking Now
        </Link>
      </div>
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-opacity ${
        isActive ? "opacity-100 font-semibold" : "opacity-60 hover:opacity-100"
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full border flex items-center justify-center ${
          isActive
            ? "border-white bg-white text-black"
            : "border-white/15"
        }`}
      >
        <span className="text-[10px]">{label[0]}</span>
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto w-full max-w-xl px-4 pt-6">
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-around px-2 py-2">
          <NavItem href="/today" label="Today" />
          <NavItem href="/overall" label="Overall" />
          <NavItem href="/add" label="+" />
          <NavItem href="/social" label="Social" />
          <NavItem href="/profile" label="Profile" />
        </div>
      </nav>
    </div>
  );
}

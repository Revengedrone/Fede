import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV_LINKS: { label: string; to?: string }[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Accounts", to: "/accounts" },
  { label: "Transfer & Pay", to: "/transfer" },
  { label: "Cards" },
  { label: "Investments" },
  { label: "Loans" },
  { label: "Support" },
];

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2">
      <img src="/logo.png" alt="Logo" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
      <span className="text-base font-extrabold tracking-tight text-[#6A2C91] sm:text-xl">WestStar Bank</span>
    </Link>
  );
}

export function AppHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  async function onLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden justify-center gap-6 text-sm font-medium text-slate-700 lg:flex">
          {NAV_LINKS.map(l => l.to ? (
            <Link key={l.label} to={l.to} className="hover:text-[#6A2C91]" activeProps={{ className: "text-[#6A2C91]" }}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href="#" className="hover:text-[#6A2C91]">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5 text-slate-600" />
          </button>
          <button onClick={onLogout} className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-block">
            Log out
          </button>
          <button onClick={() => setNavOpen(v => !v)} className="rounded-md border border-slate-200 p-1.5 lg:hidden" aria-label="Toggle menu">
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {navOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2 text-sm font-medium text-slate-700 sm:px-6">
            {NAV_LINKS.map(l => l.to ? (
              <Link key={l.label} to={l.to} onClick={() => setNavOpen(false)} className="py-2">{l.label}</Link>
            ) : (
              <a key={l.label} href="#" onClick={() => setNavOpen(false)} className="py-2">{l.label}</a>
            ))}
            <button onClick={onLogout} className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-left text-slate-700 sm:hidden">
              Log out
            </button>
          </nav>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-1 sm:px-6">
        <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
        <span>Â© 2026 WestStar Bank. All rights reserved.</span>
        <span className="hidden sm:inline">|</span>
        <a href="#" className="text-[#6A2C91]">Privacy Policy</a>
        <a href="#" className="text-[#6A2C91]">Terms of Use</a>
        <a href="#" className="text-[#6A2C91]">Security Center</a>
      </div>
    </footer>
  );
}


import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bell, Eye, Wallet, Send, FileText, Plus, UserPlus, CreditCard, LayoutGrid,
  ChevronRight, ShieldCheck, Lock, Headphones, Smartphone, Globe, Menu, X, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyBalance, adjustMyBalance } from "@/lib/balance.functions";
import { getMyTransactions } from "@/lib/transactions.functions";
import heroBg from "@/assets/img1.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — WestStar Bank" },
      { name: "description", content: "View your accounts and total balance." },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.png" alt="Logo" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
      <span className="text-base font-extrabold tracking-tight text-[#6A2C91] sm:text-xl">WestStar Bank</span>
    </div>
  );
}

type ActionKey = "transfer" | "pay" | "add" | "send" | "cards" | "statements" | "more";

type Txn = { id: string; name: string; date: string; amt: number };

const NAV_LINKS: { label: string; to?: string }[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Accounts", to: "/accounts" },
  { label: "Transfer & Pay", to: "/transfer" },
  { label: "Cards" },
  { label: "Investments" },
  { label: "Loans" },
  { label: "Support" },
];

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchBalance = useServerFn(getMyBalance);
  const adjustBalance = useServerFn(adjustMyBalance);
  const fetchTransactions = useServerFn(getMyTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance() });
  const { data: txnData, isLoading: txnsLoading } = useQuery({
    queryKey: ["my-transactions", 8],
    queryFn: () => fetchTransactions({ data: { limit: 8 } }),
  });

  const [action, setAction] = useState<ActionKey | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const balance = data?.balance ?? 0;
  const pendingHolds = data?.pendingHolds ?? 0;
  const availableBalance = data?.availableBalance ?? balance;
  const name =
    data?.email?.split("@")[0]?.replace(/[^a-z]/gi, " ").replace(/\b\w/g, c => c.toUpperCase()) || "there";

  const mutation = useMutation({
    mutationFn: (v: { delta: number; label: string; kind: string; success: string }) =>
      adjustBalance({ data: { delta: v.delta, label: v.label, kind: v.kind } }),
    onSuccess: (res, v) => {
      qc.setQueryData(["my-balance"], (prev: any) => (prev ? { ...prev, balance: res.balance } : prev));
      qc.invalidateQueries({ queryKey: ["my-balance"] });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
      setToast(v.success);
      setTimeout(() => setToast(null), 3500);
      setAction(null);
    },
    onError: (err: Error) => setToast(err.message),
  });

  async function onLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const accounts = [
    { name: "Checking Account", num: "4587", amt: balance * 0.35, kind: "Available" },
    { name: "Savings Account", num: "1245", amt: balance * 0.45, kind: "Available" },
    { name: "Business Account", num: "7890", amt: balance * 0.20, kind: "Available" },
    { name: "Credit Card", num: "3456", amt: -1700, kind: "Outstanding" },
  ];

  const txns: Txn[] = (txnData?.transactions ?? []).map(t => ({
    id: t.id,
    name: t.label,
    date: new Date(t.createdAt).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    }),
    amt: t.amount,
  }));

  const actions: { key: ActionKey; icon: any; label: string }[] = [
    { key: "transfer", icon: Send, label: "Transfer Money" },
    { key: "pay", icon: FileText, label: "Pay Bills" },
    { key: "add", icon: Plus, label: "Add Money" },
    { key: "send", icon: UserPlus, label: "Send Money" },
    { key: "cards", icon: CreditCard, label: "Cards" },
    { key: "statements", icon: FileText, label: "Statements" },
    { key: "more", icon: LayoutGrid, label: "More" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden justify-center gap-6 text-sm font-medium text-slate-700 lg:flex">
            {NAV_LINKS.map(l => l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className="hover:text-[#6A2C91]"
                activeProps={{ className: "text-[#6A2C91]" }}
              >
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href="#" className="hover:text-[#6A2C91]">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#6A2C91] text-[10px] text-white">3</span>
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6A2C91]/20 text-sm font-semibold text-[#6A2C91]">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-right text-xs">
                <div className="text-slate-500">Good morning,</div>
                <div className="truncate font-semibold text-slate-900">{name}</div>
              </div>
            </div>
            <button onClick={onLogout} className="hidden rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-block">
              Log out
            </button>
            <button
              onClick={() => setNavOpen(v => !v)}
              className="rounded-md border border-slate-200 p-1.5 lg:hidden"
              aria-label="Toggle menu"
            >
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
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#6A2C91]/80 via-[#5A2478]/70 to-[#F58220]/60" />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-12 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col justify-center text-white">
            <p className="text-base font-light sm:text-lg">Good morning,</p>
            <h1 className="truncate text-3xl font-bold sm:text-4xl md:text-5xl">{name}</h1>
            <p className="mt-3 max-w-sm text-sm text-white/80 sm:text-base">
              Here's what's happening with your accounts today.
            </p>
            <button className="mt-6 w-fit rounded-lg border border-white/50 px-5 py-2.5 text-sm font-medium hover:bg-white/10">
              View Financial Overview
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-sm font-medium">Account Balance</span>
                  <button onClick={() => setShowBalance(v => !v)} aria-label="Toggle balance visibility">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 truncate text-3xl font-bold text-slate-900 sm:text-4xl">
                  {isLoading ? "…" : showBalance ? fmt(balance) : "••••••"}
                </div>
              </div>
              <div className="shrink-0 rounded-lg bg-[#6A2C91]/10 p-2 text-[#6A2C91]"><Wallet className="h-6 w-6" /></div>
            </div>
            <div className="my-4 h-px bg-slate-100" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Available Balance</div>
                <div className="text-base font-semibold text-slate-900 sm:text-lg">
                  {isLoading ? "…" : showBalance ? fmt(availableBalance) : "••••••"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Pending Holds</div>
                <div className="text-base font-semibold text-slate-900 sm:text-lg">
                  {isLoading ? "…" : showBalance ? fmt(pendingHolds) : "••••••"}
                </div>
              </div>
            </div>
            <div className="my-4 h-px bg-slate-100" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Monthly Income</div>
                <div className="text-base font-semibold text-emerald-600 sm:text-lg">+$6,250.00</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Monthly Expenses</div>
                <div className="text-base font-semibold text-slate-900 sm:text-lg">$2,430.00</div>
              </div>
            </div>
            <Link
              to="/accounts"
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-[#6A2C91]/10 py-2.5 text-sm font-medium text-[#6A2C91] hover:bg-[#6A2C91]/20"
            >
              View All Accounts <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mx-auto -mt-6 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-5">
          <div className="mb-3 text-sm font-semibold text-slate-900 sm:mb-0 sm:hidden">Quick Actions</div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden text-sm font-semibold text-slate-900 sm:block">Quick Actions</div>
            <div className="grid w-full flex-1 grid-cols-4 gap-2 sm:flex sm:items-center sm:justify-around sm:gap-4">
              {actions.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setAction(key)}
                  className="flex flex-col items-center gap-1.5 text-[11px] leading-tight text-slate-600 hover:text-[#6A2C91] sm:gap-2 sm:text-xs"
                >
                  <div className="rounded-full bg-[#6A2C91]/10 p-2.5 text-[#6A2C91] sm:p-3"><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
                  <span className="text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-3">
        {/* Accounts */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Accounts</h3>
            <Link to="/accounts" className="text-xs font-medium text-[#6A2C91] hover:underline">View All</Link>
          </div>
          <div className="mt-4 space-y-3">
            {accounts.map(a => (
              <div key={a.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-[#6A2C91]/10 p-2 text-[#6A2C91]"><CreditCard className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{a.name}</div>
                    <div className="text-xs text-slate-500">•••• {a.num}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold ${a.amt < 0 ? "text-red-500" : "text-slate-900"}`}>{fmt(a.amt)}</div>
                  <div className="text-xs text-slate-500">{a.kind}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-xs font-medium text-[#6A2C91] hover:underline">View All</Link>
          </div>
          <div className="mt-4 space-y-3">
            {txnsLoading ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : txns.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No transactions yet — try a Quick Action below.
              </p>
            ) : (
              txns.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.date}</div>
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${t.amt < 0 ? "text-slate-900" : "text-emerald-600"}`}>
                    {t.amt < 0 ? "-" : "+"}{fmt(Math.abs(t.amt))}
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            to="/transactions"
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-[#6A2C91]/10 py-2.5 text-sm font-medium text-[#6A2C91] hover:bg-[#6A2C91]/20"
          >
            View All Transactions <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Promo */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6A2C91] to-[#F58220] p-6 text-white shadow-sm">
          <h3 className="text-2xl font-bold">Banking on<br />the go, anytime</h3>
          <p className="mt-2 text-sm text-white/80">Our mobile app puts your finances at your fingertips.</p>
          <button
            onClick={() => setAction("more")}
            className="mt-4 rounded-lg border border-white/50 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Learn More
          </button>
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="rounded-md bg-black/40 px-3 py-2 text-[10px]">📱 App Store</div>
            <div className="rounded-md bg-black/40 px-3 py-2 text-[10px]">▶ Google Play</div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Bank with Confidence", desc: "Your security is our highest priority." },
            { icon: Lock, title: "Secure & Encrypted", desc: "256-bit SSL encryption keeps your data safe." },
            { icon: Headphones, title: "24/7 Support", desc: "Our support team is always here to help you." },
            { icon: Smartphone, title: "Bank Anywhere", desc: "Access your accounts anytime, anywhere on any device." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="shrink-0 rounded-full border border-[#6A2C91]/20 bg-white p-2 text-[#6A2C91]"><Icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL Secured</span>
          <span className="hidden sm:inline">|</span>
          <span>© 2026 WestStar Bank. All rights reserved.</span>
          <span className="hidden sm:inline">|</span>
          <a href="#" className="text-[#6A2C91]">Privacy Policy</a>
          <a href="#" className="text-[#6A2C91]">Terms of Use</a>
          <a href="#" className="text-[#6A2C91]">Security Center</a>
          <Globe className="h-3 w-3" />
        </div>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-sm justify-center px-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
            <Check className="h-4 w-4 text-emerald-400" /> {toast}
          </div>
        </div>
      )}

      {/* Modals */}
      {action && (
        <ActionModal
          action={action}
          balance={balance}
          submitting={mutation.isPending}
          onClose={() => setAction(null)}
          onSubmit={(delta, label, success) => mutation.mutate({ delta, label, kind: action, success })}
        />
      )}
    </div>
  );
}

function ActionModal({
  action, balance, submitting, onClose, onSubmit,
}: {
  action: ActionKey;
  balance: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (delta: number, label: string, success: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const cfg = {
    transfer: { title: "Transfer Money", cta: "Transfer", direction: -1 as const, needsRecipient: true, recipientLabel: "To account / recipient" },
    pay:      { title: "Pay Bills",      cta: "Pay",      direction: -1 as const, needsRecipient: true, recipientLabel: "Biller / account number" },
    add:      { title: "Add Money",      cta: "Add",      direction: 1 as const,  needsRecipient: true, recipientLabel: "Funding source (card / bank)" },
    send:     { title: "Send Money",     cta: "Send",     direction: -1 as const, needsRecipient: true, recipientLabel: "Recipient email or phone" },
  } as const;

  if (action === "cards" || action === "statements" || action === "more") {
    return (
      <ModalShell title={action === "cards" ? "Your Cards" : action === "statements" ? "Statements" : "More Services"} onClose={onClose}>
        <p className="text-sm text-slate-600">
          {action === "cards"
            ? "Manage debit and credit cards, freeze/unfreeze, set limits, and view your active card details."
            : action === "statements"
            ? "Download monthly statements and view your full transaction history for each account."
            : "Investments, loans, foreign exchange, business tools and more — coming soon."}
        </p>
        <div className="mt-5 space-y-2">
          {(action === "cards"
            ? ["Debit Card •••• 4587", "Credit Card •••• 3456", "Virtual Card •••• 9021"]
            : action === "statements"
            ? ["Checking Account — May 2026", "Savings Account — May 2026", "Business Account — April 2026"]
            : ["Investments", "Loans & Mortgages", "Foreign Exchange", "Business Banking"]
          ).map(item => (
            <div key={item} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 text-sm">
              <span className="text-slate-700">{item}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-[#6A2C91] py-2.5 text-sm font-semibold text-white hover:bg-[#4A1F66]">
          Close
        </button>
      </ModalShell>
    );
  }

  const c = cfg[action];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErr("Enter a valid amount greater than 0.");
    if (c.direction === -1 && amt > balance) return setErr("Insufficient funds.");
    if (c.needsRecipient && !recipient.trim()) return setErr("Please enter a recipient / source.");
    const delta = c.direction * amt;
    const label =
      action === "transfer" ? `Transfer to ${recipient}` :
      action === "pay"      ? `Bill payment — ${recipient}` :
      action === "add"      ? `Deposit from ${recipient}` :
                              `Sent to ${recipient}`;
    const success =
      action === "add" ? `${fmt(amt)} added to your account.` : `${fmt(amt)} ${action === "pay" ? "paid" : "sent"} successfully.`;
    onSubmit(delta, label, success);
  }

  return (
    <ModalShell title={c.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Amount (USD)</label>
          <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 focus-within:border-[#6A2C91]">
            <span className="text-slate-400">$</span>
            <input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" autoFocus
              className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Available: {fmt(balance)}</p>
        </div>
        {c.needsRecipient && (
          <div>
            <label className="text-xs font-medium text-slate-600">{c.recipientLabel}</label>
            <input
              value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder={c.recipientLabel}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#6A2C91]"
            />
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-slate-600">Note (optional)</label>
          <input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="What's this for?"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#6A2C91]"
          />
        </div>
        {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit" disabled={submitting}
            className="rounded-lg bg-[#6A2C91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4A1F66] disabled:opacity-60"
          >
            {submitting ? "Processing…" : c.cta}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
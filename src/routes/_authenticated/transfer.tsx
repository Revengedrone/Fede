import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Send, FileText, Plus, UserPlus, Check } from "lucide-react";
import { getMyBalance, adjustMyBalance } from "@/lib/balance.functions";
import { AppHeader, AppFooter } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/transfer")({
  component: TransferPage,
  head: () => ({
    meta: [
      { title: "Transfer & Pay â€” FEDERAL RESERVE" },
      { name: "description", content: "Transfer money, pay bills, and send funds from FEDERAL RESERVE." },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Kind = "transfer" | "pay" | "add" | "send";

const TABS: { key: Kind; label: string; icon: any; direction: 1 | -1; recipientLabel: string; cta: string }[] = [
  { key: "transfer", label: "Transfer Money", icon: Send, direction: -1, recipientLabel: "To account / recipient", cta: "Transfer" },
  { key: "pay", label: "Pay Bills", icon: FileText, direction: -1, recipientLabel: "Biller / account number", cta: "Pay" },
  { key: "add", label: "Add Money", icon: Plus, direction: 1, recipientLabel: "Funding source (card / bank)", cta: "Add" },
  { key: "send", label: "Send Money", icon: UserPlus, direction: -1, recipientLabel: "Recipient email or phone", cta: "Send" },
];

function TransferPage() {
  const qc = useQueryClient();
  const fetchBalance = useServerFn(getMyBalance);
  const adjustBalance = useServerFn(adjustMyBalance);
  const { data, isLoading } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance() });
  const balance = data?.balance ?? 0;

  const [tab, setTab] = useState<Kind>("transfer");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const active = TABS.find(t => t.key === tab)!;

  const mutation = useMutation({
    mutationFn: (v: { delta: number; label: string; kind: string }) =>
      adjustBalance({ data: { delta: v.delta, label: v.label, kind: v.kind } }),
    onSuccess: (res) => {
      qc.setQueryData(["my-balance"], (prev: any) => (prev ? { ...prev, balance: res.balance } : prev));
      qc.invalidateQueries({ queryKey: ["my-balance"] });
      qc.invalidateQueries({ queryKey: ["my-transactions"] });
      setAmount("");
      setRecipient("");
      setNote("");
      setToast(`${active.cta === "Add" ? "Money added" : `${active.cta} completed`} successfully.`);
      setTimeout(() => setToast(null), 3500);
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErr("Enter a valid amount greater than 0.");
    if (active.direction === -1 && amt > balance) return setErr("Insufficient funds.");
    if (!recipient.trim()) return setErr("Please enter a recipient / source.");

    const delta = active.direction * amt;
    const label =
      tab === "transfer" ? `Transfer to ${recipient}` :
      tab === "pay" ? `Bill payment â€” ${recipient}` :
      tab === "add" ? `Deposit from ${recipient}` :
      `Sent to ${recipient}`;

    mutation.mutate({ delta, label, kind: tab });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader title="Transfer & Pay" />

      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Available balance</div>
          <div className="text-2xl font-bold text-slate-900">{isLoading ? "â€¦" : fmt(balance)}</div>
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setErr(null); }}
              className={`flex flex-col items-center gap-1.5 rounded-xl py-3 text-[11px] font-medium ${
                tab === t.key ? "bg-[#003A70] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className="text-xs font-medium text-slate-600">Amount (USD)</label>
            <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 focus-within:border-[#003A70]">
              <span className="text-slate-400">$</span>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Available: {fmt(balance)}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">{active.recipientLabel}</label>
            <input
              value={recipient} onChange={e => setRecipient(e.target.value)}
              placeholder={active.recipientLabel}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#003A70]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Note (optional)</label>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="What's this for?"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#003A70]"
            />
          </div>

          {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

          <button
            type="submit" disabled={mutation.isPending}
            className="w-full rounded-lg bg-[#003A70] py-2.5 text-sm font-semibold text-white hover:bg-[#002A52] disabled:opacity-60"
          >
            {mutation.isPending ? "Processingâ€¦" : active.cta}
          </button>
        </form>

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-medium text-[#003A70] hover:underline">â† Back to dashboard</Link>
        </div>
      </section>

      <AppFooter />

      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-sm justify-center px-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
            <Check className="h-4 w-4 text-emerald-400" /> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

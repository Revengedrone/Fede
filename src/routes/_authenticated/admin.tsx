import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, Check } from "lucide-react";
import { getAllProfiles, adminAdjustBalance, adminSetPendingHolds } from "@/lib/admin.functions";
import { AppHeader, AppFooter } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin — KchelBank" }],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function AdminPage() {
  const qc = useQueryClient();
  const fetchProfiles = useServerFn(getAllProfiles);
  const adjustBalance = useServerFn(adminAdjustBalance);
  const setHolds = useServerFn(adminSetPendingHolds);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: () => fetchProfiles(),
    retry: false,
  });

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [holdInputs, setHoldInputs] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const holdsMutation = useMutation({
    mutationFn: (v: { targetUserId: string; holds: number }) => setHolds({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setToast("Pending holds updated.");
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  function applyHolds(userId: string) {
    const raw = holdInputs[userId];
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt < 0) {
      setToast("Enter a valid holds amount (0 or more).");
      return;
    }
    holdsMutation.mutate({ targetUserId: userId, holds: amt });
  }

  const mutation = useMutation({
    mutationFn: (v: { targetUserId: string; delta: number; label: string }) =>
      adjustBalance({ data: v }),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setAmounts(a => ({ ...a, [v.targetUserId]: "" }));
      setToast(`Updated balance for user.`);
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  function apply(userId: string, sign: 1 | -1) {
    const raw = amounts[userId];
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Enter a valid amount greater than 0.");
      return;
    }
    const label = labels[userId]?.trim() || (sign > 0 ? "Admin credit" : "Admin debit");
    mutation.mutate({ targetUserId: userId, delta: sign * amt, label });
  }

  // Not an admin (or not logged in as one) — the server functions enforce this regardless,
  // this is just a friendlier message than a raw error.
  const forbidden = error && /forbidden/i.test((error as Error).message);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader title="Admin Panel" />

      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : forbidden ? (
          <div className="flex items-start gap-3 rounded-2xl bg-white p-6 shadow-sm">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-slate-900">Admin access required</p>
              <p className="mt-1 text-sm text-slate-500">
                Your account isn't flagged as an admin. Ask whoever manages the Supabase project to
                set <code className="rounded bg-slate-100 px-1">is_admin = true</code> on your profile row.
              </p>
              <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
                ← Back to dashboard
              </Link>
            </div>
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">{(error as Error).message}</p>
        ) : (
          <div className="space-y-3">
            {data?.profiles.map(p => (
              <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.email ?? p.id}</div>
                    <div className="text-xs text-slate-500">
                      {p.isAdmin ? "Admin" : "User"} · Balance: <span className="font-medium text-slate-700">{fmt(p.balance)}</span>
                      {" · "}Holds: <span className="font-medium text-slate-700">{fmt(p.pendingHolds)}</span>
                      {" · "}Available: <span className="font-medium text-slate-700">{fmt(Math.max(p.balance - p.pendingHolds, 0))}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center rounded-lg border border-slate-200 px-3 sm:w-40">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={amounts[p.id] ?? ""}
                      onChange={e => setAmounts(a => ({ ...a, [p.id]: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                    />
                  </div>
                  <input
                    value={labels[p.id] ?? ""}
                    onChange={e => setLabels(l => ({ ...l, [p.id]: e.target.value }))}
                    placeholder="Note (optional)"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => apply(p.id, 1)}
                      disabled={mutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Credit
                    </button>
                    <button
                      onClick={() => apply(p.id, -1)}
                      disabled={mutation.isPending}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Debit
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center rounded-lg border border-slate-200 px-3 sm:w-40">
                    <span className="text-slate-400">$</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={holdInputs[p.id] ?? ""}
                      onChange={e => setHoldInputs(h => ({ ...h, [p.id]: e.target.value }))}
                      placeholder={fmt(p.pendingHolds)}
                      className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                    />
                  </div>
                  <span className="text-xs text-slate-500">Set pending holds (reduces available balance)</span>
                  <button
                    onClick={() => applyHolds(p.id)}
                    disabled={holdsMutation.isPending}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                  >
                    Set Holds
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">← Back to dashboard</Link>
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

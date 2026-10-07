import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  getAllProfiles, adminAdjustBalance, adminSetPendingHolds, adminSetMonthlyFigures,
  getUserTransactions, adminDeleteTransaction, adminSetFullName,
} from "@/lib/admin.functions";
import { AppHeader, AppFooter } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Admin — FEDERAL RESERVE" }],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function todayLocalDatetime() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminPage() {
  const qc = useQueryClient();
  const fetchProfiles = useServerFn(getAllProfiles);
  const adjustBalance = useServerFn(adminAdjustBalance);
  const setHolds = useServerFn(adminSetPendingHolds);
  const setMonthlyFigures = useServerFn(adminSetMonthlyFigures);
  const fetchUserTxns = useServerFn(getUserTransactions);
  const deleteTxn = useServerFn(adminDeleteTransaction);
  const setFullName = useServerFn(adminSetFullName);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: () => fetchProfiles(),
    retry: false,
  });

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [holdInputs, setHoldInputs] = useState<Record<string, string>>({});
  const [incomeInputs, setIncomeInputs] = useState<Record<string, string>>({});
  const [expenseInputs, setExpenseInputs] = useState<Record<string, string>>({});
  const [nameInputs, setNameInputs] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (v: { targetUserId: string; delta: number; label: string; date?: string }) =>
      adjustBalance({ data: v }),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-user-transactions", v.targetUserId] });
      setAmounts(a => ({ ...a, [v.targetUserId]: "" }));
      setToast(`Updated balance for user.`);
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  const holdsMutation = useMutation({
    mutationFn: (v: { targetUserId: string; holds: number }) => setHolds({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setToast("Pending holds updated.");
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  const monthlyFiguresMutation = useMutation({
    mutationFn: (v: { targetUserId: string; monthlyIncome: number; monthlyExpenses: number }) =>
      setMonthlyFigures({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setToast("Monthly income/expenses updated.");
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  const nameMutation = useMutation({
    mutationFn: (v: { targetUserId: string; fullName: string }) => setFullName({ data: v }),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      setNameInputs(n => {
        const { [v.targetUserId]: _removed, ...rest } = n;
        return rest;
      });
      setToast("Name updated.");
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err: Error) => setToast(err.message),
  });

  const deleteTxnMutation = useMutation({
    mutationFn: (v: { transactionId: string; targetUserId: string }) =>
      deleteTxn({ data: { transactionId: v.transactionId } }),
    onSuccess: (_res, v) => {
      qc.invalidateQueries({ queryKey: ["admin-user-transactions", v.targetUserId] });
      setToast("Transaction deleted.");
      setTimeout(() => setToast(null), 2500);
    },
    onError: (err: Error) => setToast(err.message),
  });

  function applyName(userId: string) {
    nameMutation.mutate({ targetUserId: userId, fullName: nameInputs[userId] ?? "" });
  }

  function apply(userId: string, sign: 1 | -1) {
    const raw = amounts[userId];
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Enter a valid amount greater than 0.");
      return;
    }
    const label = labels[userId]?.trim() || (sign > 0 ? "Admin credit" : "Admin debit");
    const dateInput = dates[userId];
    const date = dateInput ? new Date(dateInput).toISOString() : undefined;
    mutation.mutate({ targetUserId: userId, delta: sign * amt, label, date });
  }

  function applyHolds(userId: string) {
    const raw = holdInputs[userId];
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt < 0) {
      setToast("Enter a valid holds amount (0 or more).");
      return;
    }
    holdsMutation.mutate({ targetUserId: userId, holds: amt });
  }

  function applyMonthlyFigures(userId: string, currentIncome: number, currentExpenses: number) {
    const incomeRaw = incomeInputs[userId];
    const expensesRaw = expenseInputs[userId];
    const income = incomeRaw !== undefined && incomeRaw !== "" ? Number(incomeRaw) : currentIncome;
    const expenses = expensesRaw !== undefined && expensesRaw !== "" ? Number(expensesRaw) : currentExpenses;
    if (!Number.isFinite(income) || income < 0) {
      setToast("Enter a valid monthly income (0 or more).");
      return;
    }
    if (!Number.isFinite(expenses) || expenses < 0) {
      setToast("Enter a valid monthly expenses (0 or more).");
      return;
    }
    monthlyFiguresMutation.mutate({ targetUserId: userId, monthlyIncome: income, monthlyExpenses: expenses });
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
              <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-[#003A70] hover:underline">
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
                    <div className="mt-0.5 text-xs text-slate-500">
                      Monthly Income: <span className="font-medium text-emerald-600">{fmt(p.monthlyIncome)}</span>
                      {" · "}Monthly Expenses: <span className="font-medium text-slate-700">{fmt(p.monthlyExpenses)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {expanded[p.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Transactions
                  </button>
                </div>

                {/* Display name */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-xs text-slate-500 sm:w-28">Display name</span>
                  <input
                    value={nameInputs[p.id] ?? p.fullName ?? ""}
                    onChange={e => setNameInputs(n => ({ ...n, [p.id]: e.target.value }))}
                    placeholder="e.g. John Smith"
                    maxLength={100}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#003A70] sm:max-w-xs"
                  />
                  <button
                    onClick={() => applyName(p.id)}
                    disabled={nameMutation.isPending}
                    className="rounded-lg bg-[#003A70] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002A52] disabled:opacity-60"
                  >
                    Save name
                  </button>
                </div>

                {/* Credit / Debit */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                  <div className="flex items-center rounded-lg border border-slate-200 px-3 sm:w-36">
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
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#003A70] sm:min-w-[10rem]"
                  />
                  <input
                    type="datetime-local"
                    value={dates[p.id] ?? ""}
                    onChange={e => setDates(d => ({ ...d, [p.id]: e.target.value }))}
                    max={todayLocalDatetime()}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#003A70]"
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
                <p className="mt-1 text-xs text-slate-400">
                  Leave date blank to use right now. Set a date to backdate a deposit/withdrawal.
                </p>

                {/* Pending holds */}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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

                {/* Monthly income / expenses */}
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 sm:w-28">Monthly Income</span>
                    <div className="flex items-center rounded-lg border border-slate-200 px-3 sm:w-36">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={incomeInputs[p.id] ?? ""}
                        onChange={e => setIncomeInputs(i => ({ ...i, [p.id]: e.target.value }))}
                        placeholder={fmt(p.monthlyIncome)}
                        className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 sm:w-28">Monthly Expenses</span>
                    <div className="flex items-center rounded-lg border border-slate-200 px-3 sm:w-36">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={expenseInputs[p.id] ?? ""}
                        onChange={e => setExpenseInputs(ex => ({ ...ex, [p.id]: e.target.value }))}
                        placeholder={fmt(p.monthlyExpenses)}
                        className="w-full bg-transparent px-2 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => applyMonthlyFigures(p.id, p.monthlyIncome, p.monthlyExpenses)}
                    disabled={monthlyFiguresMutation.isPending}
                    className="rounded-lg bg-[#003A70] px-3 py-2 text-xs font-semibold text-white hover:bg-[#002A52] disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>

                {expanded[p.id] && (
                  <UserTransactionsList
                    userId={p.id}
                    fetchUserTxns={fetchUserTxns}
                    onDelete={(transactionId) => deleteTxnMutation.mutate({ transactionId, targetUserId: p.id })}
                    deleting={deleteTxnMutation.isPending}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-medium text-[#003A70] hover:underline">← Back to dashboard</Link>
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

function UserTransactionsList({
  userId, fetchUserTxns, onDelete, deleting,
}: {
  userId: string;
  fetchUserTxns: (opts: { data: { targetUserId: string; limit?: number } }) => Promise<{
    transactions: { id: string; label: string; amount: number; kind: string; createdAt: string }[];
  }>;
  onDelete: (transactionId: string) => void;
  deleting: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-transactions", userId],
    queryFn: () => fetchUserTxns({ data: { targetUserId: userId, limit: 30 } }),
  });

  return (
    <div className="mt-4 rounded-lg border border-slate-100 p-3">
      {isLoading ? (
        <p className="py-3 text-center text-xs text-slate-400">Loading transactions…</p>
      ) : (data?.transactions.length ?? 0) === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">No transactions yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {data!.transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-900">{t.label}</div>
                <div className="text-[11px] text-slate-500">
                  {new Date(t.createdAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-xs font-semibold ${t.amount < 0 ? "text-slate-900" : "text-emerald-600"}`}>
                  {t.amount < 0 ? "-" : "+"}{fmt(Math.abs(t.amount))}
                </span>
                <button
                  onClick={() => onDelete(t.id)}
                  disabled={deleting}
                  aria-label="Delete transaction"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
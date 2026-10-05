import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getMyTransactions } from "@/lib/transactions.functions";
import { AppHeader, AppFooter } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
  head: () => ({
    meta: [
      { title: "Transaction History â€” WestStar Bank" },
      { name: "description", content: "Search and review your WestStar Bank transaction history." },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Filter = "all" | "in" | "out";

function TransactionsPage() {
  const fetchTransactions = useServerFn(getMyTransactions);
  const { data, isLoading } = useQuery({
    queryKey: ["my-transactions", 100],
    queryFn: () => fetchTransactions({ data: { limit: 100 } }),
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const all = data?.transactions ?? [];
    return all.filter(t => {
      if (filter === "in" && t.amount < 0) return false;
      if (filter === "out" && t.amount >= 0) return false;
      if (query.trim() && !t.label.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [data, query, filter]);

  const totalIn = (data?.transactions ?? []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = (data?.transactions ?? []).filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader title="Transaction History" />

      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total money in</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">{isLoading ? "â€¦" : fmt(totalIn)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total money out</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{isLoading ? "â€¦" : fmt(Math.abs(totalOut))}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center rounded-lg border border-slate-200 px-3 focus-within:border-[#6A2C91] sm:w-72">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search transactionsâ€¦"
                className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "in", "out"] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    filter === f ? "bg-[#6A2C91] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "in" ? "Money in" : "Money out"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading transactionsâ€¦</p>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {data?.transactions?.length ? "No transactions match your search." : "No transactions yet."}
              </p>
            ) : (
              rows.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{t.label}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${t.amount < 0 ? "text-slate-900" : "text-emerald-600"}`}>
                    {t.amount < 0 ? "-" : "+"}{fmt(Math.abs(t.amount))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <Link to="/dashboard" className="text-sm font-medium text-[#6A2C91] hover:underline">â† Back to dashboard</Link>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}

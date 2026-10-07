import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wallet, PiggyBank, Briefcase, ArrowRight } from "lucide-react";
import { getMyBalance } from "@/lib/balance.functions";
import { AppHeader, AppFooter } from "@/components/app-header";

export const Route = createFileRoute("/_authenticated/accounts")({
  component: AccountsPage,
  head: () => ({
    meta: [
      { title: "Accounts â€” FEDERAL RESERVE" },
      { name: "description", content: "View all of your FEDERAL RESERVE accounts and balances." },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

function AccountsPage() {
  const fetchBalance = useServerFn(getMyBalance);
  const { data, isLoading } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance() });
  const balance = data?.balance ?? 0;

  const accounts = [
    { name: "Checking Account", num: "4587", amt: balance * 0.35, kind: "Available", icon: Wallet, desc: "Everyday spending account" },
    { name: "Savings Account", num: "1245", amt: balance * 0.45, kind: "Available", icon: PiggyBank, desc: "Earning 2.10% APY" },
    { name: "Business Account", num: "7890", amt: balance * 0.20, kind: "Available", icon: Briefcase, desc: "For your business finances" },
  ];

  const totalAvailable = accounts.filter(a => a.amt >= 0).reduce((s, a) => s + a.amt, 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader title="Accounts" />

      <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#003A70] to-[#002A52] p-6 text-white shadow-sm">
          <p className="text-sm text-red-100">Total available across all accounts</p>
          <p className="mt-1 text-3xl font-bold sm:text-4xl">{isLoading ? "â€¦" : fmt(totalAvailable)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map(a => (
            <div key={a.name} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#003A70]/10 p-2.5 text-[#003A70]"><a.icon className="h-5 w-5" /></div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                    <div className="text-xs text-slate-500">•••• {a.num}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-2xl font-bold ${a.amt < 0 ? "text-red-500" : "text-slate-900"}`}>
                  {isLoading ? "â€¦" : fmt(a.amt)}
                </div>
                <div className="text-xs text-slate-500">{a.kind}</div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{a.desc}</p>
              <Link
                to="/transfer"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#003A70] hover:underline"
              >
                Move money <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <Link to="/transactions" className="text-sm font-medium text-[#003A70] hover:underline">
            View transaction history â†’
          </Link>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}


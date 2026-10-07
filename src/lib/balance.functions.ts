import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("current_balance, pending_holds, email, monthly_income, monthly_expenses")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profile not found");

    const balance = Number(data.current_balance ?? 0);
    const pendingHolds = Number(data.pending_holds ?? 0);

    return {
      email: data.email as string | null,
      balance,
      pendingHolds,
      availableBalance: Math.max(balance - pendingHolds, 0),
      monthlyIncome: Number(data.monthly_income ?? 0),
      monthlyExpenses: Number(data.monthly_expenses ?? 0),
    };
  });

export const adjustMyBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { delta: number; label?: string; kind?: string }) => {
    if (typeof input?.delta !== "number" || !Number.isFinite(input.delta)) {
      throw new Error("Invalid amount");
    }
    if (Math.abs(input.delta) > 100_000_000) throw new Error("Amount out of range");
    const label = (input.label ?? (input.delta >= 0 ? "Deposit" : "Withdrawal")).slice(0, 200);
    const kind = input.kind ?? "other";
    return { delta: input.delta, label, kind };
  })
  .handler(async ({ context, data }) => {
    const { data: row, error: readErr } = await context.supabase
      .from("profiles")
      .select("current_balance")
      .eq("id", context.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Profile not found");

    const current = Number(row.current_balance ?? 0);
    const next = current + data.delta;
    if (next < 0) throw new Error("Insufficient funds");

    const { error: updErr } = await context.supabase
      .from("profiles")
      .update({ current_balance: next })
      .eq("id", context.userId);
    if (updErr) throw new Error(updErr.message);

    // Best-effort transaction record — the balance update above is the source of truth,
    // so we don't fail the whole request if logging the history row has a hiccup.
    const { error: txnErr } = await context.supabase.from("transactions").insert({
      user_id: context.userId,
      label: data.label,
      amount: data.delta,
      kind: data.kind,
    });
    if (txnErr) console.error("[adjustMyBalance] failed to record transaction:", txnErr.message);
    return { balance: next };
  });
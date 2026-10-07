import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TxnKind = "transfer" | "pay" | "add" | "send" | "other";

export const getMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { limit?: number }) => ({ limit: input?.limit ?? 25 }))
  .handler(async ({ context, data }) => {
    const limit = Math.min(Math.max(data.limit, 1), 200);

    const { data: rows, error } = await context.supabase
      .from("transactions")
      .select("id, label, amount, kind, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return {
      transactions: (rows ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        amount: Number(r.amount),
        kind: r.kind as TxnKind,
        createdAt: r.created_at,
      })),
    };
  });


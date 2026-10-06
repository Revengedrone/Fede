import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertIsAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", context.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.is_admin) throw new Error("Forbidden: admin access required");
}

export const getAllProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertIsAdmin(context);

    // Admin-only path: use the service-role client to read every profile, bypassing RLS.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, current_balance, pending_holds, is_admin, created_at")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return {
      profiles: (data ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        balance: Number(p.current_balance ?? 0),
        pendingHolds: Number(p.pending_holds ?? 0),
        isAdmin: p.is_admin,
        createdAt: p.created_at,
      })),
    };
  });

export const adminSetPendingHolds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; holds: number }) => {
    if (!input?.targetUserId) throw new Error("Missing target user");
    if (typeof input?.holds !== "number" || !Number.isFinite(input.holds) || input.holds < 0) {
      throw new Error("Invalid holds amount");
    }
    if (input.holds > 100_000_000) throw new Error("Amount out of range");
    return { targetUserId: input.targetUserId, holds: input.holds };
  })
  .handler(async ({ context, data }) => {
    await assertIsAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ pending_holds: data.holds })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);

    return { pendingHolds: data.holds };
  });
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetUserId: string; delta: number; label?: string }) => {
    if (!input?.targetUserId) throw new Error("Missing target user");
    if (typeof input?.delta !== "number" || !Number.isFinite(input.delta) || input.delta === 0) {
      throw new Error("Invalid amount");
    }
    if (Math.abs(input.delta) > 100_000_000) throw new Error("Amount out of range");
    return {
      targetUserId: input.targetUserId,
      delta: input.delta,
      label: (input.label ?? "Admin balance adjustment").slice(0, 200),
    };
  })
  .handler(async ({ context, data }) => {
    await assertIsAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("current_balance")
      .eq("id", data.targetUserId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Target user not found");

    const current = Number(row.current_balance ?? 0);
    const next = current + data.delta;
    if (next < 0) throw new Error("Resulting balance cannot be negative");

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ current_balance: next })
      .eq("id", data.targetUserId);
    if (updErr) throw new Error(updErr.message);

    const { error: txnErr } = await supabaseAdmin.from("transactions").insert({
      user_id: data.targetUserId,
      label: data.label,
      amount: data.delta,
      kind: "admin",
    });
    if (txnErr) console.error("[adminAdjustBalance] failed to record transaction:", txnErr.message);

    return { balance: next };
  });

import { createServerFn } from "@tanstack/react-start";

// Idempotent one-shot: seed two demo users with fixed balances.
// Safe to call repeatedly; existing users are left in place.
export const seedDemoUsers = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const demoUsers = [
    { email: "Christucker@gmail.com", password: "@12340", balance: 7500000.0 },
    { email: "bob@demo.app", password: "Demo!Pass123", balance: 120.0 },
  ];

  const results: Array<{ email: string; status: string }> = [];

  for (const u of demoUsers) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    let userId = created?.user?.id;

    if (createErr) {
      // Likely already exists â€” look them up.
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users.find((x) => x.email === u.email)?.id;
      if (!userId) {
        results.push({ email: u.email, status: `error: ${createErr.message}` });
        continue;
      }
    }

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId!, email: u.email, current_balance: u.balance });

    results.push({
      email: u.email,
      status: upErr ? `profile error: ${upErr.message}` : "ok",
    });
  }

  return { results };
});


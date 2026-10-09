import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Owner-approved initial account invitations only. This is not the governed staff invitation
// route, does not grant memberships, and must never activate a tenant or clinical authority.
const recipients = ["mansoer", "mikhail", "tasneem", "ziyaad"] as const;
const journalPath = ".staff-invitations.local";
type Entry = { state: "prepared" | "accepted" | "uncertain" | "existing"; at: string };
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  process.env.STAFF_INITIAL_INVITATIONS_CONFIRM === "four-named-accounts-no-permissions" &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY,
  "STAFF_INITIAL_INVITATIONS_GUARD_REJECTED",
);
const journal: Partial<Record<(typeof recipients)[number], Entry>> = existsSync(journalPath)
  ? JSON.parse(readFileSync(journalPath, "utf8"))
  : {};
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
invariant(!existing.error && existing.data.users.length < 1000, "STAFF_INVENTORY_UNAVAILABLE");
for (const recipient of recipients) {
  const email = `${recipient}@meneerhealth.co.za`;
  if (journal[recipient]) {
    console.log(
      JSON.stringify({ recipient, result: "held-no-repeat", state: journal[recipient]!.state }),
    );
    continue;
  }
  const found = existing.data.users.some((user) => user.email?.toLowerCase() === email);
  journal[recipient] = { state: found ? "existing" : "prepared", at: new Date().toISOString() };
  // Persist before the external effect. Prepared/uncertain sends never repeat automatically.
  writeFileSync(journalPath, JSON.stringify(journal), { mode: 0o600 });
  if (found) {
    console.log(JSON.stringify({ recipient, result: "existing-no-send" }));
    continue;
  }
  try {
    const result = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://meneerhealth.co.za/staff/sign-in",
    });
    const accepted = !result.error && result.data.user?.email?.toLowerCase() === email;
    journal[recipient] = {
      state: accepted ? "accepted" : "uncertain",
      at: new Date().toISOString(),
    };
  } catch {
    journal[recipient] = { state: "uncertain", at: new Date().toISOString() };
  }
  writeFileSync(journalPath, JSON.stringify(journal), { mode: 0o600 });
  console.log(
    JSON.stringify({ recipient, result: journal[recipient]!.state, permissionsGranted: 0 }),
  );
}

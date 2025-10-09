/**
 * Skapar/inviterar användare och sätter roll i public.profiles.
 * Kör: npm run invite:users
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const USERS = [
  { email: "oliver.bentzer@nilsahlgren.se", role: "ADMIN" as const },
  { email: "info@dovas.se", role: "STANGSEL" as const },
  { email: "oskar.tylebrink@nilsahlgren.se", role: "SKRUV" as const },
];

type Role = "ADMIN" | "SKRUV" | "STANGSEL";

async function upsertProfile(supabase: ReturnType<typeof createClient>, id: string, email: string, role: Role) {
  await supabase.from("profiles").upsert({ id, email, name: email.split("@")[0], role });
}

async function inviteOne(supabase: ReturnType<typeof createClient>, email: string, role: Role) {
  const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });
  if (inviteErr && inviteErr.message.includes("already registered")) {
    // Already exists, fetch user id
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    if (user) {
      await upsertProfile(supabase, user.id, email, role);
    }
  } else if (invited?.user) {
    await upsertProfile(supabase, invited.user.id, email, role);
  }

  // Generate magic link in console (optional)
  const { data: link } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (link?.properties?.action_link) {
    console.log(`Magic link for ${email}:`, link.properties.action_link);
  }
}

async function main() {
  if (!url || !serviceKey) {
    throw new Error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  }
  const supabase = createClient(url, serviceKey);

  for (const user of USERS) {
    await inviteOne(supabase, user.email, user.role);
  }

  console.log("Klart! Kolla konsolen för magiska länkar om du vill logga in direkt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

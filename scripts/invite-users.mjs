/**
 * Skapar/inviterar användare och sätter roll i public.profiles.
 * Kör: npm run invite:users
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const USERS = [
  { email: "oliver.bentzer@nilsahlgren.se", role: "ADMIN" },
  { email: "info@dovas.se", role: "STANGSEL" },
  { email: "oskar.tylebrink@nilsahlgren.se", role: "SKRUV" },
];

/**
 * Läser in en .env-fil i process.env om den inte redan har definierats.
 */
function loadEnv() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const fullPath = resolve(process.cwd(), file);
    if (!existsSync(fullPath)) {
      continue;
    }

    const contents = readFileSync(fullPath, "utf-8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const normalized = line.startsWith("export ") ? line.slice(7) : line;
      const equalsIndex = normalized.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = normalized.slice(0, equalsIndex).trim();
      if (!key) {
        continue;
      }

      let value = normalized.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }

    // Stoppa efter första träffen för att matcha Next.js-beteende.
    break;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function upsertProfile(supabase, id, email, role) {
  const name = email.split("@")[0];
  const { error } = await supabase
    .from("profiles")
    .upsert({ id, email, name, role });

  if (error) {
    throw error;
  }
}

async function inviteOne(supabase, email, role) {
  const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (inviteErr && inviteErr.message.includes("already registered")) {
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      throw listErr;
    }

    const user = users?.users?.find((u) => u.email === email);
    if (user) {
      await upsertProfile(supabase, user.id, email, role);
    }
  } else if (invited?.user) {
    await upsertProfile(supabase, invited.user.id, email, role);
  } else if (inviteErr) {
    throw inviteErr;
  }

  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (linkErr) {
    throw linkErr;
  }

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

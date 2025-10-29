# Säljstöd NA — Next.js 14 + Supabase (magic link)

Ett minimalistiskt, premium internt säljverktyg byggt med **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-stil + lucide-react + Framer Motion** och **Supabase** (auth + Postgres).

## Funktioner (MVP)
- Magic link-inloggning (Supabase).
- Dashboard med nyheter (pinnade först) och rollanpassade moduler.
- Besöksrapporter: kundregister, lista med filter/sök, skapa/redigera, detalj med tidslinje, markera uppföljning klar, **Exportera CSV/PDF**.
- Nyheter: lista + detalj (Markdown), admin-CRUD under `/admin/nyheter` (**endast ADMIN**).
- Profil & inställningar: e-post, roll, mörkt läge (lokalt).
- Behörighet via `profiles.role` (ADMIN/SKRUV/STANGSEL) och RLS-policies.
- Audit-loggar för viktiga händelser.

## Kom igång
1) Skapa ett Supabase-projekt. Hämta:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (behövs för scriptet nedan)
2) Konfigurera miljövariabler:
   ```bash
   cp .env.example .env.local
   # Fyll i .env.local (inkl. NEXT_PUBLIC_SITE_URL=http://localhost:3000)
   ```
3) Skapa tabeller + policies (kör i Supabase SQL Editor):
   - Kör `supabase/sql/schema.sql`
   - Kör `supabase/sql/policies.sql`
   - Om du satte upp databasen innan 2024-05-22, kör även patchen `supabase/sql/patches/20240522_customer_contacts.sql` för att lägga till kontaktpersoner-tabellen.
4) Installera beroenden:
   ```bash
   npm i
   ```
5) Seed (frivilligt): `supabase/sql/seed.sql`
6) Starta dev:
   ```bash
   npm run dev
   ```

   Kommandot ovan startar utvecklingsservern för huvudappen på port **3000**.

### Skicka invites / magiska länkar (rekommenderat)
Scriptet skapar användarna och sätter deras roll i `profiles`:
```bash
npm run invite:users
```
Fördefinierade konton:
- ADMIN: `oliver.bentzer@nilsahlgren.se`
- STANGSEL: `info@dovas.se`
- SKRUV: `oskar.tylebrink@nilsahlgren.se`

Alternativt: Supabase Dashboard → Auth → Users → **Invite**. Skapa sedan rader i `public.profiles` med rätt `id`/`email`/`role`.

## Struktur
```
/app
  /auth/callback/route.ts     -- tar emot kod och skapar session
  /login/page.tsx             -- magic link-login
  /logout/route.ts            -- POST sign-out
  /admin/nyheter/page.tsx     -- ADMIN-CRUD för nyheter
  /nyheter/..., /rapporter/... -- nyheter och besöksrapporter
  layout.tsx, page.tsx
/components/ui                -- shadcn-liknande UI-komponenter
/lib/supabase                 -- server/client helpers (SSR cookies)
/lib/rbac.ts                  -- rollhämtning
/lib/audit.ts                 -- audit log helper
/supabase/sql                 -- schema, policies, seed
/scripts/invite-users.ts      -- skicka invites/magiska länkar
```

## Behörighet & RLS
- **ADMIN**: full åtkomst till rapporter + nyhets-CRUD.
- **SKRUV**: Kundregister och rapporter för egna kunder.
- **STANGSEL**: Dashboard med offertmodul (kommer snart) och nyheter.
- Se `supabase/sql/policies.sql` för exakta policies.

## Tillgänglighet
- Semantiska element, fokusstilar, kontrast, respekt för `prefers-reduced-motion` i CSS (och subtila animationer).

## Tester
- Playwright finns installerat (lägg egna tester i `tests/`).

## Design
- Varumärke: **Säljstöd NA**.
- Primär färg: **#0033A1** (hover/nyanser i Tailwind-konfig).
- Typografi: **Inter** via `next/font`.
- Stil: premium/minimalistisk, hairlines + mjuka skuggor, subtila mikrointeraktioner.

---

> Tips: Om du stöter på 401/permission-problem – verifiera att policies är körda och att `profiles`-rader finns för respektive `auth.users`-id.

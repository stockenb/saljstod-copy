# Säljstöd NA — Next.js 14

Ett minimalistiskt internt säljverktyg byggt med **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-stil + lucide-react + Framer Motion**. Projektet körs just nu helt utan Supabase eller autentisering.

## Aktuell status
- Supabase-integration (auth, Postgres, middleware) är borttagen.
- Alla sidor renderar utan krav på inloggning och visar statisk information eller platshållare.
- API-rutter och server actions som tidigare skrev till databasen returnerar nu ett kontrollerat felmeddelande.

## Kom igång
1. Installera beroenden:
   ```bash
   npm install
   ```
2. Starta utvecklingsservern:
   ```bash
   npm run dev
   ```
   Appen är tillgänglig på `http://localhost:3000` och kräver ingen inloggning.

## Projektstruktur
```
/app                     -- App Router-sidor och API-rutter
/components              -- Delade UI-komponenter
/design                  -- Designfiler och prototyper
/lib                      -- Diverse hjälpfunktioner (utan Supabase)
/public                  -- Statisk media
/scripts                 -- Hjälpskript (Supabase-skriptet är inaktivt)
/supabase                -- Tidigare SQL-skript (behålls som referens)
```

## Återinföra autentisering och Supabase (översikt)
Vill du aktivera Supabase igen? Följ i korthet dessa steg:
1. Installera Supabase-paketen:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```
2. Återställ hjälpfilerna i `lib/supabase/` (klienter för browser/server) och uppdatera berörda sidor att använda dem för datahämtning.
3. Lägg tillbaka middleware med `createServerClient` för att skydda rutter.
4. Återinför `/auth/callback`, `/logout` samt Supabase-anropen i `app/**/actions.ts` och API-rutterna.
5. Sätt miljövariabler (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` m.fl.) lokalt och i Vercel.
6. Om SQL-schemat behöver återskapas: kör filerna i `supabase/sql/` i ditt Supabase-projekt.

> Tips: ta bort gamla Supabase-miljövariabler i Vercel om de inte längre används.

## Designprinciper
- Premium/minimalistisk känsla med hairlines och subtila skuggor.
- Tailwind CSS för layout/typografi, shadcn-komponenter för formulär.
- Responsivitet och tillgänglighet bevarad även utan inloggning.

## Tester
- Playwright är installerat; lägg egna tester i `tests/` vid behov.

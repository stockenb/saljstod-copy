# Interaktionsspecifikation

Beskrivningen nedan kan användas som underlag för att skapa giffer/video. Varje scenario anger trigger, animation och tillstånd.

## Hover på kort (Dashboard "Idag"-kort)
- **Trigger:** `:hover`
- **Animation:** `transform: translateY(-2px)` och `box-shadow: shadow-card-hover` över 180ms ease-calm.
- **Återgång:** samma animation bakåt när hover lämnar.

## Fokusmarkering
- **Trigger:** `:focus-visible` på knappar, länkar och formulär.
- **Animation:** 3px ring i `rgba(0,51,161,0.6)` + 2px offset. CSS-övergång 120ms.
- **Tillgänglighet:** Kontrasten uppfyller WCAG 2.1 AA.

## Snabblänksknapp
- **Trigger:** Hover eller fokus på snabblänk i dashboard.
- **Animation:** Border färgas `#0033A1`, ikon `ArrowUpRight` roteras 15° och färgas blå över 180ms.
- **Återgång:** Åter till neutral border och ikonfärg.

## Laddning (skelett)
- **Trigger:** Datahämtning (t.ex. `reports` laddas).
- **Animation:** Visa `div` med `animate-pulse`, gradient `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))` i ljus, mörk variant använder `rgba(255,255,255,0.1)`.

## Toast/notis
- **Trigger:** Åtgärd slutförd (t.ex. sparad kund).
- **Animation:** Slide-up från nederkant (`translateY(16px)` till `0`) och fade in (`opacity: 0` → `1`) på 200ms. Auto-dismiss efter 6 sekunder med fade ut.

## Tabellrader
- **Trigger:** Hover på rapportrad.
- **Animation:** Bakgrund till `#E6ECF8`, textfärg `#0033A1`. Ingen layoutskift.

## Dark mode-toggle (Profil)
- **Trigger:** Klick på "Växla mörkt läge".
- **Animation:** `document.documentElement.classList.toggle('dark')`. Body-bakgrund uppdateras med gradient transition 300ms.

Instruktionerna ovan säkerställer att interaktionerna känns snabba, diskreta och konsekventa över hela intranätet.

# UI-styleguide

## Färgroller

| Roll | Hex | Användning |
| --- | --- | --- |
| Primär bakgrund | `#F7F8FB` | Globala bakgrunder, dashboardytor. |
| Primär blå | `#0033A1` | Navigation, länkar, fokusindikatorer. |
| Primär blå 600 | `#002C8C` | Hover/pressed i navigation. |
| Accent orange | `#FF530A` | Primära CTA, progressindikatorer. |
| Accent orange 600 | `#E64A08` | Hover på CTA. |
| Yta vit | `#FFFFFF` | Kort, formulär, tabeller (ljus). |
| Yta mörk | `#0F172A` | Kort och bakgrunder i mörkt läge. |
| Divider | `rgba(15,23,42,0.08)` | Subtila avdelare i ljus. |
| Text mörk | `#1F2937` | Standardbrödtext. |
| Text ljus | `#F9FAFB` | Text mot mörk bakgrund. |
| Success | `#16A34A` (`#DCFCE7`) | Statuschip, feedback. |
| Warning | `#F59E0B` (`#FEF3C7`) | Aviseringar. |
| Danger | `#DC2626` (`#FEE2E2`) | Felmeddelanden. |

## Typografi

- Primär font: **Work Sans** – antialiasad, hög läsbarhet.
- Rubrikskala:
  - H1: 32px / 38px, vikt 600
  - H2: 24px / 32px, vikt 600
  - H3: 20px / 28px, vikt 600
- Brödtext: 16–18px, radavstånd 1.6, max 70 tecken radlängd.
- Metadata: 12px uppercase med 0.3em bokstavsspärning.

## Spacing & layout

- Basgrid: 12 kolumner, 24px gutter desktop, 16px mobilt.
- Sektioner på sida: `space-y-10` (40px).
- Inre spacing i kort: 24px.
- Element spacing i listor/tabeller: 12–16px.
- Corner-radius: 24px på kort, 18px på knappar/inputs, `pill` på chips.

## Ikonstil

- Linjära ikoner (Lucide) med 1.5px stroke.
- Färg: vit/`#CCD8F1` i toppnav, `#0033A1` eller `#1F2937` på ljusa ytor.
- Ikoner används sparsamt och alltid med textetikett.

## Komponentexempel

### Knappar

- **Primär**: `bg-#FF530A`, text vit, rundad pill, subtil skugga.
- **Sekundär**: Blå kontur, text blå, hover ger blå tonad bakgrund.
- **Ghost**: Transparent med blå text, ljus bakgrund på hover.
- Fokus: 3px ring i `rgba(0,51,161,0.6)` + offset 2px.

### Kort

- Rundade 24px hörn, border `rgba(15,23,42,0.08)` ljus, `rgba(148,163,184,0.16)` mörk.
- Skugga: `0 12px 32px -16px rgba(15, 23, 42, 0.2)`.
- Hover: `shadow-card-hover`, lätt -2px translateY.

### Tabeller

- `table-shell` wrapper med rundade hörn och border.
- Header: uppercase 12px, bakgrund `#F3F4F6`.
- Zebra-rader: varannan rad `rgba(15,23,42,0.03)`.
- Hover: `bg-primary-50/60`.

### Formulär

- Inputs/textarea: 44–48px höga, rundade 20px, border `surface-border`.
- Hjälptext under fält i 13px neutral 500.
- Fel: `border-danger`, text röd, ikon `AlertCircle`.
- Framgång: `border-success`, text grön.

### Chips & taggar

- `Badge` komponent i uppercase 12px.
- Statusfärger: success (grön), danger (röd), warning (gul), neutral (grå), info (blå).
- Snabblänkar använder `pill-chip` med blå indikator på hover.

## Mikrointeraktioner

- Hover: skuggor ökar och komponent flyttas upp 2px.
- Fokus: tydlig blå ring med offset.
- Laddning: använd skelettblock (`animate-pulse`) eller inline spinner i komponent.
- Toasts: placeras nederst till höger, vit bakgrund, max två rader, auto-dismiss efter 6s.

Denna styleguide säkerställer en sammanhållen upplevelse i både ljus och mörk version utan att påverka befintliga flöden.

import Link from "next/link";

const features = [
  {
    emoji: "⚡",
    title: "Snabba arbetsflöden",
    description:
      "Allt säljmateriel samlat på ett ställe gör att du slipper hoppa mellan verktyg och kan fokusera på kunden.",
  },
  {
    emoji: "🧭",
    title: "Tydlig vägledning",
    description:
      "Steg-för-steg-stöd för offert, uppföljning och leverans säkerställer en jämn upplevelse för varje kund.",
  },
  {
    emoji: "🤝",
    title: "Delat kunnande",
    description:
      "Mallbibliotek, checklistor och färdigt bildmaterial gör det enkelt att dela bästa praxis inom teamet.",
  },
];

const workflows = [
  {
    href: "/produktblad",
    title: "Skapa produktblad",
    description: "Bygg färdiga produktblad som PDF och anpassa dem innan kundmötet.",
    emoji: "🛠️",
    cta: "Öppna verktyget",
  },
  {
    href: "https://nilsahlgren.se/media-kit",
    title: "Mediabibliotek",
    description: "Ladda ned logotyper, bilder och presentationsmaterial för din pitch.",
    emoji: "🖼️",
    cta: "Till resurserna",
  },
  {
    href: "mailto:marketing@nilsahlgren.se",
    title: "Beställ marknadsstöd",
    description: "Behöver du kampanjmaterial eller hjälp med ett case? Kontakta marknadsteamet.",
    emoji: "🎯",
    cta: "Skicka e-post",
  },
  {
    href: "https://nilsahlgren.se/utbildning",
    title: "Utbildningar och guider",
    description: "Se inspelade genomgångar och få manualer för våra vanligaste säljprocesser.",
    emoji: "📚",
    cta: "Utforska utbildningar",
  },
];

const highlights = [
  {
    title: "Veckans fokus",
    description: "Tema: Industristängsel – samla referenscase och uppdatera prislistan i säljteamets drive.",
  },
  {
    title: "Ny resurs",
    description: "Mall för kampanjmejl ligger nu i biblioteket under Kommunikation → Mallar.",
  },
  {
    title: "Tips",
    description: "Boka in en 10-minuters avstämning efter varje platsbesök för att fånga upp nästa steg direkt.",
  },
];

function WorkflowCard({ workflow }: { workflow: (typeof workflows)[number] }) {
  const isExternal = workflow.href.startsWith("http") || workflow.href.startsWith("mailto:");

  return (
    <Link
      href={workflow.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="card group flex h-full flex-col gap-4 p-6 transition-colors duration-calm ease-calm"
    >
      <span className="text-4xl" aria-hidden>
        {workflow.emoji}
      </span>
      <h2 className="font-heading text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
        {workflow.title}
      </h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{workflow.description}</p>
      <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-medium text-neutral-900 transition-colors duration-calm ease-calm group-hover:text-primary-600 dark:text-neutral-100">
        {workflow.cta}
        <span
          aria-hidden
          className="translate-x-0 text-base transition-transform duration-calm ease-calm group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 pb-20">
      <header className="flex flex-col gap-5">
        <span className="pill-chip w-fit bg-white/70 text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-200">Säljstöd</span>
        <div className="max-w-2xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
            Ditt nav för allt säljmaterial hos Nils Ahlgren
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-300">
            Här samlar vi verktyg, guider och mallar som hjälper dig att leverera en proffsig kundupplevelse – utan att behöva logga in i flera system.
          </p>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="card flex flex-col gap-3 p-6">
            <span className="text-3xl" aria-hidden>
              {feature.emoji}
            </span>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
              {feature.title}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Kom igång snabbt</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Öppna våra mest använda resurser och verktyg direkt härifrån.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.title} workflow={workflow} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Aktuellt i teamet</h2>
          <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
            {highlights.map((item) => (
              <li key={item.title} className="rounded-xl bg-white/60 p-3 dark:bg-neutral-900/60">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                <p className="text-neutral-600 dark:text-neutral-300">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">Behöver du hjälp?</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Kontakta oss så ser vi till att du får rätt underlag. Ange kund, projekt och önskat material så hör vi av oss.
          </p>
          <div className="rounded-xl bg-neutral-900/5 p-4 text-sm text-neutral-700 dark:bg-white/5 dark:text-neutral-200">
            <p className="font-medium">Säljstöd &amp; marknad</p>
            <p>marketing@nilsahlgren.se</p>
            <p>08-500 125 80</p>
          </div>
        </div>
      </section>
    </div>
  );
}

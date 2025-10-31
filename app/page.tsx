import Link from "next/link";

type Card = {
  href: string;
  title: string;
  description: string;
  emoji: string;
  variant?: "compact";
};

const primaryCards: Card[] = [
  {
    href: "https://karta.nilsahlgren.se",
    title: "Villastängsel",
    description: "Planeringsstöd och resurser för villastängsel.",
    emoji: "🏡",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "Industristängsel",
    description: "Projektunderlag och översikter för industristängsel.",
    emoji: "🏭",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "Panelstängsel",
    description: "Samlad information om panelstängselprojekt.",
    emoji: "⛓️",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "Viltstängsel",
    description: "Resurser och verktyg för viltstängsel.",
    emoji: "🦌",
  },
];

const secondaryCards: Card[] = [
  {
    href: "https://karta.nilsahlgren.se",
    title: "EAN",
    description: "Snabb åtkomst till EAN-uppslag.",
    emoji: "🏷️",
    variant: "compact" as const,
  },
  {
    href: "/produktblad",
    title: "Skapa produktblad",
    description: "Generera redigerbara produktblad som PDF.",
    emoji: "📝",
    variant: "compact" as const,
  },
];

function CardLink({ card }: { card: Card }) {
  const isCompact = card.variant === "compact";

  const baseClasses =
    "group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";
  const padding = isCompact ? "p-4" : "p-6";
  const titleClasses = `mt-4 font-semibold text-neutral-900 ${isCompact ? "text-lg" : "text-xl"}`;
  const descriptionClasses = `mt-2 text-neutral-600 ${isCompact ? "text-xs" : "text-sm"}`;
  const ctaClasses = `mt-auto inline-flex items-center gap-1 pt-6 font-medium text-neutral-900 ${
    isCompact ? "text-xs" : "text-sm"
  }`;

  return (
    <Link
      key={`${card.title}-${card.href}`}
      href={card.href}
      target="_blank"
      rel="noreferrer"
      className={`${baseClasses} ${padding}`}
    >
      <div className={isCompact ? "text-3xl" : "text-4xl"} aria-hidden>
        {card.emoji}
      </div>
      <h2 className={titleClasses}>{card.title}</h2>
      <p className={descriptionClasses}>{card.description}</p>
      <span className={ctaClasses}>
        Öppna
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Välj verktyg</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Välj vilket intranätsverktyg du vill öppna.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {primaryCards.map((card) => (
            <CardLink key={`${card.title}-${card.href}`} card={card} />
          ))}
        </div>
        <div className="pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Övriga verktyg</h3>
          <div className="mt-3 max-w-xs">
            {secondaryCards.map((card) => (
              <CardLink key={`${card.title}-${card.href}`} card={card} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

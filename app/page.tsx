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
    description: "Stängselplanerare för villastängsel.",
    emoji: "🏡",
  },
  {
    href: "https://industristangsel.vercel.app/",
    title: "Industristängsel - Under produktion",
    description: "Stängselplanerare för industristängsel + XML-export",
    emoji: "🏭",
  },
  {
    href: "",
    title: "Panelstängsel",
    description: "Stängselplanerare för panelstängsel.",
    emoji: "𝄜",
  },
  {
    href: "",
    title: "Viltstängsel",
    description: "Stängselplanerare för viltstängsel.",
    emoji: "🦌",
  },
];

const secondaryCards: Card[] = [
  {
    href: "/ean",
    title: "Skapa EAN",
    description: "Skapa egna EAN13-koder",
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
  {
    href: "/produktblad/samlat",
    title: "Skapa samlat produktblad",
    description: "Skapa ett produktblad med flera artiklar.",
    emoji: "🧰",
    variant: "compact" as const,
  },
];

function CardLink({ card }: { card: Card }) {
  const isCompact = card.variant === "compact";
  const isInactive = !card.href; // tom href => inaktivt kort

  const baseClasses =
    "group relative flex h-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400";
  const hoverActive = !isInactive ? "hover:-translate-y-0.5 hover:shadow-md" : "";
  const padding = isCompact ? "p-4" : "p-6";
  const titleClasses = `mt-4 font-semibold text-neutral-900 ${isCompact ? "text-lg" : "text-xl"}`;
  const descriptionClasses = `mt-2 text-neutral-600 ${isCompact ? "text-xs" : "text-sm"}`;
  const ctaClasses = `mt-auto inline-flex items-center gap-1 pt-6 font-medium ${
    isCompact ? "text-xs" : "text-sm"
  } ${isInactive ? "text-neutral-500" : "text-neutral-900"}`;

  const content = (
    <>
      {/* Emoji */}
      <div className={isCompact ? "text-3xl" : "text-4xl"} aria-hidden>
        {card.emoji}
      </div>

      {/* Title & description */}
      <h2 className={titleClasses}>{card.title}</h2>
      <p className={descriptionClasses}>{card.description}</p>

      {/* CTA */}
      <span className={ctaClasses}>
        {isInactive ? "Kommer snart" : "Öppna"}
        {!isInactive && <span className="transition-transform group-hover:translate-x-0.5">→</span>}
      </span>

      {/* Grå overlay + avtoning när inaktiv */}
      {isInactive && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-neutral-100/50"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl backdrop-grayscale backdrop-opacity-80" aria-hidden />
        </>
      )}
    </>
  );

  // Rendera som <div> när inaktiv (för att undvika klick & Next Link-varning)
  if (isInactive) {
    return (
      <div
        className={`${baseClasses} ${padding} ${hoverActive} cursor-not-allowed opacity-80`}
        aria-disabled="true"
        role="link"
        tabIndex={-1}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      key={`${card.title}-${card.href}`}
      href={card.href}
      className={`${baseClasses} ${padding} ${hoverActive}`}
    >
      {content}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Stängselplanerare</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Välj vilken stängselplanerare du vill öppna.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {primaryCards.map((card) => (
            <CardLink key={`${card.title}-${card.href || card.title}`} card={card} />
          ))}
        </div>
        <div className="pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Övriga verktyg
          </h3>
          <div className="mt-3 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            {secondaryCards.map((card) => (
              <CardLink key={`${card.title}-${card.href}`} card={card} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

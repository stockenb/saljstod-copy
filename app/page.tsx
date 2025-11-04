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
    "group relative flex h-full flex-col rounded-2xl border border-white/40 bg-white/80 shadow-sm transition backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60";
  const hoverActive = !isInactive
    ? "hover:-translate-y-1 hover:border-white/60 hover:shadow-lg hover:shadow-slate-900/10"
    : "";
  const padding = isCompact ? "p-4" : "p-6";
  const titleClasses = `mt-4 font-semibold text-slate-900 ${
    isCompact ? "text-lg" : "text-xl"
  }`;
  const descriptionClasses = `mt-2 text-slate-600 ${
    isCompact ? "text-xs" : "text-sm"
  }`;
  const ctaClasses = `mt-auto inline-flex items-center gap-1 pt-6 font-medium ${
    isCompact ? "text-xs" : "text-sm"
  } ${isInactive ? "text-slate-500" : "text-slate-900"}`;

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
            className="pointer-events-none absolute inset-0 rounded-2xl bg-white/50"
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
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <div
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-200/60 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-1/2 top-1/3 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-white/60 blur-3xl"
        aria-hidden
      />
      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-20 sm:px-12">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_25px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-sky-600 shadow-sm">
              Välkommen tillbaka
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Stängselplanerare
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Utforska våra planeringsverktyg och resurser för att skapa skräddarsydda stängsellösningar på ett tryggt och effektivt sätt.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {primaryCards.map((card) => (
              <CardLink key={`${card.title}-${card.href || card.title}`} card={card} />
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/50 bg-white/60 p-6 shadow-inner">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Övriga verktyg
            </h3>
            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {secondaryCards.map((card) => (
                <CardLink key={`${card.title}-${card.href}`} card={card} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

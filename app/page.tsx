import Link from "next/link";

const cards = [
  {
    href: "https://karta.nilsahlgren.se",
    title: "Viltstängsel",
    description: "Resurser och verktyg för viltstängsel.",
    emoji: "🦌",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "Paneler",
    description: "Samlad information om panelprojekt.",
    emoji: "🧱",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "EAN",
    description: "Snabb åtkomst till EAN-uppslag.",
    emoji: "🏷️",
    variant: "compact" as const,
  },
];

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const isCompact = card.variant === "compact";

            return (
              <Link
                key={`${card.title}-${card.href}`}
                href={card.href}
                target="_blank"
                rel="noreferrer"
                className={`group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${isCompact ? "p-4" : "p-6"}`}
              >
                <div className={isCompact ? "text-3xl" : "text-4xl"} aria-hidden>
                  {card.emoji}
                </div>
                <h2 className={`mt-4 font-semibold text-neutral-900 ${isCompact ? "text-lg" : "text-xl"}`}>
                  {card.title}
                </h2>
                <p className={`mt-2 text-neutral-600 ${isCompact ? "text-xs" : "text-sm"}`}>
                  {card.description}
                </p>
                <span
                  className={`mt-auto inline-flex items-center gap-1 pt-6 font-medium text-neutral-900 ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  Öppna
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

const cards = [
  {
    href: "/villastangsel",
    title: "Villastangsel",
    description: "Intranätsverktyg för villastängsel.",
    emoji: "🏡",
  },
  {
    href: "/industristangsel",
    title: "Industristangsel",
    description: "Intranätsverktyg för industristängsel.",
    emoji: "🏭",
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <div className="text-4xl" aria-hidden>
                {card.emoji}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-neutral-900">{card.title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{card.description}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-neutral-900">
                Öppna
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

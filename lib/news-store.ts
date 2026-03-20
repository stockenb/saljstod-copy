export type NewsCategory = "Produkter" | "System" | "Kampanj" | "Övrigt";

export type NewsItem = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  category: NewsCategory;
  date: string;
  slug: string;
  pinned?: boolean;
};

const STORAGE_KEY = "na_nyheter";

export const DEFAULT_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "Välkommen till det nya säljstödet",
    content:
      "Det interna säljverktyget har fått ett helt nytt utseende och nya funktioner. Vi har designat om hela gränssnittet för att göra det enklare att navigera och snabbare att hitta det du behöver.\n\nNya funktioner inkluderar:\n- Nyhetsflöde direkt på startsidan\n- Förbättrad profilsida med adminverktyg\n- Ny navigation med snabbare åtkomst till alla verktyg\n- Möjlighet att skapa och publicera nyheter som administratör",
    excerpt:
      "Det interna säljverktyget har fått ett helt nytt utseende och nya funktioner för bättre användarupplevelse.",
    author: "Administratör",
    category: "System",
    date: "2026-03-19",
    slug: "valkommen-till-nya-saljstodet",
    pinned: true,
  },
  {
    id: "2",
    title: "Ny stängselplanerare för panelstängsel",
    content:
      "Inom kort lanseras en ny planerare för panelstängsel. Verktyget kommer att erbjuda samma funktionalitet som villastängselplaneraren men anpassad för panelstängsel.\n\nFör mer information, kontakta produktchefen.",
    excerpt:
      "Inom kort lanseras en ny planerare för panelstängsel med avancerade funktioner.",
    author: "Produktteam",
    category: "Produkter",
    date: "2026-03-15",
    slug: "ny-stangelplanerare-panelstangsel",
    pinned: false,
  },
  {
    id: "3",
    title: "Vårens kampanjpriser nu tillgängliga",
    content:
      "Vårens kampanjpriser är nu inlagda i artikelbasen. Se till att uppdatera era offerter med de nya priserna.\n\nKampanjen gäller till och med 30 april 2026.",
    excerpt:
      "Vårens kampanjpriser är nu tillgängliga i artikelbasen. Uppdatera era offerter.",
    author: "Säljledning",
    category: "Kampanj",
    date: "2026-03-10",
    slug: "varens-kampanjpriser",
    pinned: false,
  },
];

export function getNews(): NewsItem[] {
  if (typeof window === "undefined") return DEFAULT_NEWS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_NEWS;
    return JSON.parse(stored) as NewsItem[];
  } catch {
    return DEFAULT_NEWS;
  }
}

export function saveNews(items: NewsItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addNewsItem(item: Omit<NewsItem, "id" | "slug">): NewsItem {
  const news = getNews();
  const newItem: NewsItem = {
    ...item,
    id: Date.now().toString(),
    slug: slugify(item.title),
  };
  saveNews([newItem, ...news]);
  return newItem;
}

export function deleteNewsItem(id: string): void {
  const news = getNews().filter((n) => n.id !== id);
  saveNews(news);
}

export function updateNewsItem(id: string, updates: Partial<Omit<NewsItem, "id">>): void {
  const news = getNews().map((n) =>
    n.id === id
      ? { ...n, ...updates, slug: updates.title ? slugify(updates.title) : n.slug }
      : n
  );
  saveNews(news);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("na_role") === "admin";
}

export function getUserName(): string {
  if (typeof window === "undefined") return "Säljare";
  return localStorage.getItem("na_name") || "Säljare";
}

export function getUserEmail(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("na_email") || "";
}

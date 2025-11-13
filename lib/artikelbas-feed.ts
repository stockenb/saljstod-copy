import path from "path";
import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

export type ArtikelbasArticle = {
  articleNumber: string;
  title: string;
  link: string;
};

type CachedArticle = ArtikelbasArticle & {
  searchTitle: string;
};

const FEED_PATH = path.join(process.cwd(), "app", "artikelbas", "feed.xml");

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

let cachedArticles: CachedArticle[] | null = null;
let cachePromise: Promise<CachedArticle[]> | null = null;

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string): string {
  return normalizeTitle(value)
    .normalize("NFKC")
    .toLocaleLowerCase("sv-SE");
}

type RawItem = Record<string, unknown>;

type ParsedFeed = {
  rss?: {
    channel?: {
      item?: RawItem | RawItem[];
    };
  };
};

async function loadArticles(): Promise<CachedArticle[]> {
  if (cachedArticles) {
    return cachedArticles;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = readFile(FEED_PATH, "utf8")
    .then((xml) => xml.replace(/^\uFEFF/, ""))
    .then((xml) => {
      const parsed = parser.parse(xml) as ParsedFeed;
      const rawItems = parsed?.rss?.channel?.item;
      const items = normalizeArray(rawItems);

      const articles = items
        .map((item) => {
          const articleNumber = item?.id;
          const title = item?.title;
          const link = item?.link;

          if (
            articleNumber === undefined ||
            title === undefined ||
            link === undefined
          ) {
            return null;
          }

          const normalizedTitle = normalizeTitle(String(title));

          return {
            articleNumber: String(articleNumber),
            title: normalizedTitle,
            link: String(link),
            searchTitle: normalizeSearchText(normalizedTitle),
          } satisfies CachedArticle;
        })
        .filter((article): article is CachedArticle => article !== null);

      cachedArticles = articles;
      return articles;
    })
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}

type ArticleSearchOptions = {
  excludeBulk?: boolean;
};

function getSearchMatcher(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const hasLeadingWildcard = trimmedQuery.startsWith("%");
  const hasTrailingWildcard = trimmedQuery.endsWith("%");
  const strippedQuery = trimmedQuery.replace(/^%+/, "").replace(/%+$/, "");
  const normalizedQuery = normalizeSearchText(strippedQuery);

  if (!normalizedQuery) {
    return null;
  }

  if (hasLeadingWildcard && hasTrailingWildcard) {
    return (value: string) => value.includes(normalizedQuery);
  }

  if (hasLeadingWildcard) {
    return (value: string) => value.endsWith(normalizedQuery);
  }

  return (value: string) => value.startsWith(normalizedQuery);
}

export async function findArticles(
  query: string,
  options: ArticleSearchOptions = {},
): Promise<ArtikelbasArticle[]> {
  const matcher = getSearchMatcher(query);

  if (!matcher) {
    return [];
  }

  const articles = await loadArticles();

  return articles
    .filter((article) => !options.excludeBulk || !article.articleNumber.startsWith("B"))
    .filter((article) => matcher(article.searchTitle))
    .map(({ searchTitle, ...visible }) => visible);
}

export async function getAllArticles(): Promise<ArtikelbasArticle[]> {
  const articles = await loadArticles();
  return articles.map(({ searchTitle, ...visible }) => visible);
}

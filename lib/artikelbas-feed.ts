import path from "path";
import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

import type { PackagingFilterValue } from "./artikelbas-filters";

export type ArtikelbasArticle = {
  articleNumber: string;
  title: string;
  link: string;
};

type CachedArticle = ArtikelbasArticle & {
  searchTitle: string;
  primaryPackaging: string | null;
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

function normalizePackaging(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.normalize("NFKC").toLocaleLowerCase("sv-SE");
}

function getSpecifications(item: RawItem): string[] {
  const rawSpecifications = item?.specifications;

  if (!rawSpecifications) {
    return [];
  }

  if (Array.isArray(rawSpecifications)) {
    return rawSpecifications.flatMap((specification) =>
      normalizeArray((specification as RawSpecifications)?.specification).map((value) =>
        String(value),
      ),
    );
  }

  return normalizeArray(rawSpecifications.specification).map((value) =>
    String(value),
  );
}

function extractPrimaryPackaging(specifications: string[]): string | null {
  const packagingEntry = specifications.find((specification) =>
    /^Primärförpackning:/i.test(specification),
  );

  if (!packagingEntry) {
    return null;
  }

  const [, value] = packagingEntry.split(/:\s*/, 2);
  return value ? value.trim() : null;
}

const PACKAGING_FILTER_TARGETS: Record<
  Exclude<PackagingFilterValue, "bulk">,
  string
> = {
  "small-pack": normalizePackaging("SB förpackning") ?? "sb förpackning",
  bucket: normalizePackaging("Hink") ?? "hink",
  package: normalizePackaging("Paket") ?? "paket",
};

type RawSpecifications = { specification?: unknown | unknown[] };

type RawItem = Record<string, unknown> & {
  specifications?: RawSpecifications | RawSpecifications[];
};

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
          const specifications = getSpecifications(item);
          const primaryPackaging = extractPrimaryPackaging(specifications);

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
            primaryPackaging,
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
  packagingFilters?: PackagingFilterValue[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchMatcher(query: string) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const hasWildcard = trimmedQuery.includes("%");
  const hasLeadingWildcard = trimmedQuery.startsWith("%");
  const hasTrailingWildcard = trimmedQuery.endsWith("%");


  const parts = trimmedQuery
    .split(/%+/)
    .map((part) => normalizeSearchText(part))
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

if (!hasWildcard) {
    const [firstPart] = parts;
    return (value: string) => value.startsWith(firstPart);
  }
 if (!hasLeadingWildcard && !hasTrailingWildcard && parts.length === 1) {
    const [onlyPart] = parts;
    return (value: string) => value.startsWith(onlyPart);
  }
  const pattern = `${hasLeadingWildcard ? "" : "^"}${parts
    .map((part) => escapeRegExp(part))
    .join(".*")}${hasTrailingWildcard ? "" : "$"}`;
  const matcher = new RegExp(pattern);

  return (value: string) => matcher.test(value);
}

function matchesPackagingFilter(
  article: CachedArticle,
  filter: PackagingFilterValue,
): boolean {
  const normalizedPackaging = normalizePackaging(article.primaryPackaging);

  if (filter === "bulk") {
    return article.articleNumber.startsWith("B");
  }

  const expected = PACKAGING_FILTER_TARGETS[filter];

  if (!expected || !normalizedPackaging) {
    return false;
  }

  return normalizedPackaging === expected;
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
  const packagingFilters = options.packagingFilters
    ? Array.from(new Set(options.packagingFilters))
    : [];

  return articles
    .filter(
      (article) => !options.excludeBulk || !article.articleNumber.startsWith("B"),
    )
    .filter(
      (article) =>
        packagingFilters.length === 0 ||
        packagingFilters.some((filter) => matchesPackagingFilter(article, filter)),
    )
    .filter((article) => matcher(article.searchTitle))
    .map(({ searchTitle, primaryPackaging, ...visible }) => visible);
}

export async function getAllArticles(): Promise<ArtikelbasArticle[]> {
  const articles = await loadArticles();
  return articles.map(({ searchTitle, primaryPackaging, ...visible }) => visible);
}

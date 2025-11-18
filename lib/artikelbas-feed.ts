import type { PackagingFilterValue } from "./artikelbas-filters";
import { getAllProducts, type Product } from "./product-feed";

export type ArtikelbasArticle = {
  articleNumber: string;
  title: string;
  link: string;
};

type CachedArticle = ArtikelbasArticle & {
  searchTitle: string;
  primaryPackaging: string | null;
};

let cachedArticles: CachedArticle[] | null = null;
let cachePromise: Promise<CachedArticle[]> | null = null;

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

const PACKAGING_FILTER_TARGETS: Record<
  Exclude<PackagingFilterValue, "bulk">,
  string
> = {
  "small-pack": normalizePackaging("SB förpackning") ?? "sb förpackning",
  bucket: normalizePackaging("Hink") ?? "hink",
  package: normalizePackaging("Paket") ?? "paket",
};

async function loadArticles(): Promise<CachedArticle[]> {
  if (cachedArticles) {
    return cachedArticles;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = getAllProducts()
    .then((products) =>
      products
        .map((product: Product): CachedArticle => {
          const normalizedTitle = normalizeTitle(product.title);

          return {
            articleNumber: product.articleNumber,
            title: normalizedTitle,
            link: product.link,
            searchTitle: normalizeSearchText(normalizedTitle),
            primaryPackaging: product.primaryPackaging,
          };
        })
        .filter((article) => article.articleNumber && article.title && article.link),
    )
    .then((articles) => {
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
  requireEveryPart?: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type SearchMatcherOptions = {
  requireEveryPart?: boolean;
};

function getSearchMatcher(query: string, options: SearchMatcherOptions = {}) {
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

  if (options.requireEveryPart && hasWildcard) {
    return (value: string) => parts.every((part) => value.includes(part));
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
  const {
    excludeBulk = false,
    packagingFilters: rawPackagingFilters,
    requireEveryPart = false,
  } = options;

  const matcher = getSearchMatcher(query, { requireEveryPart });

  if (!matcher) {
    return [];
  }

  const articles = await loadArticles();
  const packagingFilters = rawPackagingFilters
    ? Array.from(new Set(rawPackagingFilters))
    : [];

  return articles
    .filter((article) => !excludeBulk || !article.articleNumber.startsWith("B"))
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

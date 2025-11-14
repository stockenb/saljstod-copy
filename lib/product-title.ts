export type TitleAnalysisProduct = {
  articleNumber?: string | null;
  title?: string | null;
};

const MEASUREMENT_LETTERS = new Set([
  "x",
  "X",
  "Ø",
  "ø",
  "Φ",
  "φ",
  "R",
  "r",
  "M",
  "m",
]);

export function isMeasurementToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const normalized = token.replace(/\s+/g, "");

  if (!/\d/.test(normalized)) {
    return false;
  }

  const lettersOnly = normalized.replace(/[^\p{L}]/gu, "");

  if (lettersOnly.length === 0) {
    return true;
  }

  return Array.from(lettersOnly).every((letter) => MEASUREMENT_LETTERS.has(letter));
}

export function tokenizeTitle(title: string) {
  return title
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function findCommonPrefixTokens(tokenLists: string[][]) {
  if (tokenLists.length === 0) {
    return [] as string[];
  }

  let prefix = [...tokenLists[0]];

  for (let listIndex = 1; listIndex < tokenLists.length && prefix.length > 0; listIndex += 1) {
    const tokens = tokenLists[listIndex];
    const maxLength = Math.min(prefix.length, tokens.length);
    let matchLength = 0;

    while (
      matchLength < maxLength &&
      prefix[matchLength].toLowerCase() === tokens[matchLength]?.toLowerCase()
    ) {
      matchLength += 1;
    }

    prefix = prefix.slice(0, matchLength);
  }

  return prefix;
}

export function findCommonSuffixTokens(tokenLists: string[][]) {
  if (tokenLists.length === 0) {
    return [] as string[];
  }

  let suffix = [...tokenLists[0]];

  for (let listIndex = 1; listIndex < tokenLists.length && suffix.length > 0; listIndex += 1) {
    const tokens = tokenLists[listIndex];
    const maxLength = Math.min(suffix.length, tokens.length);
    let matchLength = 0;

    while (
      matchLength < maxLength &&
      suffix[suffix.length - 1 - matchLength]?.toLowerCase() ===
        tokens[tokens.length - 1 - matchLength]?.toLowerCase()
    ) {
      matchLength += 1;
    }

    suffix = suffix.slice(suffix.length - matchLength);
  }

  return suffix;
}

export function analyzeProductTitles(products: TitleAnalysisProduct[]) {
  const [firstProduct] = products;
  const fallbackTitle =
    (firstProduct?.title ?? "").trim() || (firstProduct?.articleNumber ?? "").trim() || "Samlat produktblad";

  const titles = products
    .map((product) => (product.title ?? "").trim())
    .filter(Boolean);

  if (titles.length === 0) {
    return { combinedTitle: fallbackTitle, prefixTokens: [] as string[], suffixTokens: [] as string[] };
  }

  const tokenLists = titles.map(tokenizeTitle).filter((tokens) => tokens.length > 0);

  if (tokenLists.length === 0) {
    return { combinedTitle: fallbackTitle, prefixTokens: [] as string[], suffixTokens: [] as string[] };
  }

  const prefixTokens = findCommonPrefixTokens(tokenLists);
  const suffixTokens = findCommonSuffixTokens(tokenLists);

  const prefixLength = prefixTokens.length;
  const suffixLength = suffixTokens.length;

  const sizeTokenLists = tokenLists.map((tokens) => {
    let endIndex = tokens.length - suffixLength;
    if (endIndex < prefixLength) {
      endIndex = prefixLength;
    }

    return tokens.slice(prefixLength, endIndex);
  });

  const normalizedSizes = sizeTokenLists.map((tokens) => tokens.join(" ").toLocaleLowerCase("sv-SE"));

  const hasMultipleSizes =
    normalizedSizes.length > 0 && normalizedSizes.some((value) => value !== normalizedSizes[0]);

  const representativeTokens = tokenLists[0];
  const baseTokens: string[] = [];

  if (representativeTokens.length > 0) {
    if (prefixLength > 0) {
      baseTokens.push(...representativeTokens.slice(0, prefixLength));
    }

    if (!hasMultipleSizes && (sizeTokenLists[0]?.length ?? 0) > 0) {
      baseTokens.push(...sizeTokenLists[0]);
    }

    const suffixStartIndex = representativeTokens.length - suffixLength;
    if (suffixLength > 0 && suffixStartIndex >= 0 && suffixStartIndex >= baseTokens.length) {
      baseTokens.push(...representativeTokens.slice(suffixStartIndex));
    }
  }

  while (baseTokens.length > 0) {
    const lastToken = baseTokens[baseTokens.length - 1];
    if (lastToken.toLocaleLowerCase("sv-SE") !== "mm") {
      break;
    }

    const previousToken = baseTokens[baseTokens.length - 2];
    if (isMeasurementToken(previousToken)) {
      break;
    }

    baseTokens.pop();
  }

  const combinedTitle = baseTokens.join(" ").trim() || fallbackTitle;

  return { combinedTitle, prefixTokens, suffixTokens };
}

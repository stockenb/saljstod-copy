import path from "path";
import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";

// Gemensam typ för produkter i artikelbas och produktblad
export type ProductSpecification = { key: string; value: string };
export type Product = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  // <Name> = benämning, används i produktblad och artikelbas
  // <FullDescription> = artikelbeskrivning som ska in i produktbladet
  description: string;
  // Pris/lagersaldo/short description ignoreras medvetet i produktbladet
  weight: string;
  specs: ProductSpecification[];
  primaryPackaging: string | null;
};

type RawProduct = Record<string, unknown>;

type ProductNode = { node: RawProduct; parents: RawProduct[] };

const FEED_PATH = path.join(process.cwd(), "app", "artikelbas", "feed_new.xml");

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

let cachedProducts: Product[] | null = null;
let cachePromise: Promise<Product[]> | null = null;

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ("#text" in obj && obj["#text"] !== undefined) {
      return String(obj["#text"]).trim();
    }
  }

  return "";
}

function collectProductNodes(node: unknown): ProductNode[] {
  const products: ProductNode[] = [];

  const visit = (
    value: unknown,
    parentKey?: string,
    productAncestors: RawProduct[] = [],
  ) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, parentKey, productAncestors));
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const obj = value as RawProduct;
    const isProduct = parentKey === "Product";

    if (isProduct) {
      products.push({ node: obj, parents: productAncestors });
    }

    const nextAncestors = isProduct ? [...productAncestors, obj] : productAncestors;

    Object.entries(obj).forEach(([key, entry]) => {
      visit(entry, key, nextAncestors);
    });
  };

  visit(node);

  return products;
}

function parseSpecifications(rawSpecs: unknown): ProductSpecification[] {
  const specs: ProductSpecification[] = [];
  if (!rawSpecs || typeof rawSpecs !== "object") {
    return specs;
  }

  const specNodes = (rawSpecs as Record<string, unknown>).Specification ?? rawSpecs;
  const normalizedNodes = normalizeArray(specNodes as unknown);

  normalizedNodes.forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const spec = entry as Record<string, unknown>;
    const key = getText(spec.Key ?? spec.key ?? spec["@_Key"] ?? spec["@_key"]);
    const value = getText(spec.Value ?? spec.value ?? spec["@_Value"] ?? spec["@_value"]);
    const unit = getText(spec.Unit ?? spec.unit ?? spec["@_Unit"] ?? spec["@_unit"]);

    const combinedValue = unit ? `${value} ${unit}`.trim() : value;

    if (!key.trim() || !combinedValue.trim()) {
      return;
    }

    specs.push({ key: key.trim(), value: combinedValue.trim() });
  });

  return specs;
}

function extractPrimaryPackaging(specs: ProductSpecification[]): string | null {
  const packagingEntry = specs.find((spec) => {
    const normalizedKey = spec.key
      .normalize("NFKC")
      .toLocaleLowerCase("sv-SE")
      .replace(/\s+/g, " ")
      .trim();

    return (
      normalizedKey.includes("primärförpackning") && !normalizedKey.includes("antal")
    );
  });

  return packagingEntry?.value ?? null;
}

function parseWeight(weight: unknown): string {
  if (weight === null || weight === undefined) {
    return "";
  }

  if (typeof weight === "string" || typeof weight === "number") {
    return String(weight).trim();
  }

  if (typeof weight === "object") {
    const obj = weight as Record<string, unknown>;
    const unit = getText(obj["@_unit"] ?? obj.unit ?? obj.Unit);
    const text = getText(obj["#text"] ?? obj.value ?? obj.Value ?? "");

    if (!text) {
      return "";
    }

    return unit ? `${text} ${unit}`.trim() : text;
  }

  return "";
}

function extractDescription(product: RawProduct): string {
  return (
    getText(product.FullDescription ?? product.full_description ?? product.Description) ||
    ""
  );
}

function toProduct(node: RawProduct, parents: RawProduct[]): Product | null {
  const articleNumber = getText(node["@_sku"] ?? node.sku ?? node["@_id"] ?? node.id);
  const title = getText(node.Name ?? node.Title);
  const link = getText(node.Link ?? node.link);

  if (!articleNumber || !title || !link) {
    return null;
  }

  const image = getText(node.Image ?? node.image_link ?? "");
  const directDescription = extractDescription(node);
  const ancestorDescription = [...parents]
    .reverse()
    .map((parent) => extractDescription(parent))
    .find((text) => text.length > 0);
  const description = directDescription || ancestorDescription || "";
  const weight = parseWeight(node.Weight ?? node.shipping_weight);
  const specs = parseSpecifications(node.Specifications ?? node.specifications);
  const primaryPackaging = extractPrimaryPackaging(specs);

  return {
    articleNumber,
    title: title.replace(/\s+/g, " ").trim(),
    link,
    image,
    description,
    weight,
    specs,
    primaryPackaging,
  };
}

async function loadProducts(): Promise<Product[]> {
  if (cachedProducts) {
    return cachedProducts;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = readFile(FEED_PATH, "utf8")
    .then((xml) => xml.replace(/^\uFEFF/, ""))
    .then((xml) => {
      const parsed = parser.parse(xml) as Record<string, unknown>;
      const nodes = collectProductNodes(parsed);

      const products = nodes
        .map(({ node, parents }) => toProduct(node, parents))
        .filter((product): product is Product => product !== null);

      cachedProducts = products;
      return products;
    })
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}

export async function getAllProducts(): Promise<Product[]> {
  return loadProducts();
}

export async function getProductByArticleNumber(
  articleNumber: string,
): Promise<Product | null> {
  const trimmed = articleNumber.trim();
  if (!trimmed) {
    return null;
  }

  const products = await loadProducts();
  return products.find((product) => product.articleNumber === trimmed) ?? null;
}

export async function getProductsByArticleNumbers(
  articleNumbers: string[],
): Promise<Product[]> {
  const targets = new Set(articleNumbers.map((value) => value.trim()).filter(Boolean));
  const products = await loadProducts();

  return products.filter((product) => targets.has(product.articleNumber));
}

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

export type ProductWithVariants = Product & { variants: Product[] };

export type ProductCategory = {
  id: string;
  name: string;
  parentId?: string;
  children: ProductCategory[];
  productSkus: string[];
};

type RawProduct = Record<string, unknown>;

type ProductNode = { node: RawProduct; parents: RawProduct[] };

const FEED_PATH = path.join(process.cwd(), "app", "artikelbas", "feed_new.xml");

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

type CachedFeedData = {
  products: Product[];
  categories: ProductCategory[];
  productIndex: Map<string, Product>;
  parentBySku: Map<string, string | null>;
  variantsByParentSku: Map<string, Product[]>;
  categoryIndex: Map<string, ProductCategory>;
};

let cachedFeedData: CachedFeedData | null = null;
let cachePromise: Promise<CachedFeedData> | null = null;

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

function getArticleNumber(node: RawProduct): string {
  return getText(node["@_sku"] ?? node.sku ?? node["@_id"] ?? node.id);
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
  const articleNumber = getArticleNumber(node);
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

function parseCategoryNode(
  categoryNode: RawProduct,
  parentId?: string,
): ProductCategory | null {
  const id = getText(categoryNode["@_id"] ?? categoryNode.id);
  const name = getText(categoryNode.Name ?? categoryNode.name);

  if (!id || !name) {
    return null;
  }

  const productsValue = (categoryNode.Products ?? categoryNode.products) as
    | RawProduct
    | RawProduct[]
    | Record<string, unknown>
    | undefined;
  const productEntries = normalizeArray(
    (productsValue as Record<string, unknown>)?.Product ?? productsValue,
  );
  const productSkus = productEntries
    .map((entry) =>
      entry && typeof entry === "object"
        ? getArticleNumber(entry as RawProduct)
        : "",
    )
    .filter((sku) => sku.length > 0);

  const childCategoryValue = (categoryNode.Categories ?? categoryNode.categories) as
    | RawProduct
    | RawProduct[]
    | Record<string, unknown>
    | undefined;
  const childEntries = normalizeArray(
    (childCategoryValue as Record<string, unknown>)?.Category ??
      childCategoryValue ??
      categoryNode.Category,
  );
  const children = childEntries
    .map((child) =>
      child && typeof child === "object"
        ? parseCategoryNode(child as RawProduct, id)
        : null,
    )
    .filter((child): child is ProductCategory => child !== null);

  return {
    id,
    name,
    parentId,
    children,
    productSkus,
  };
}

function indexCategories(
  categories: ProductCategory[],
  index: Map<string, ProductCategory>,
) {
  categories.forEach((category) => {
    index.set(category.id, category);
    if (category.children.length) {
      indexCategories(category.children, index);
    }
  });
}

async function loadFeedData(): Promise<CachedFeedData> {
  if (cachedFeedData) {
    return cachedFeedData;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = readFile(FEED_PATH, "utf8")
    .then((xml) => xml.replace(/^\uFEFF/, ""))
    .then((xml) => {
      const parsed = parser.parse(xml) as Record<string, unknown>;
      const nodes = collectProductNodes(parsed);

      const productIndex = new Map<string, Product>();
      const parentBySku = new Map<string, string | null>();

      const products = nodes
        .map(({ node, parents }) => {
          const product = toProduct(node, parents);
          if (!product) {
            return null;
          }

          const parentSku = [...parents]
            .map((parent) => getArticleNumber(parent))
            .filter(Boolean)
            .pop();

          productIndex.set(product.articleNumber, product);
          parentBySku.set(product.articleNumber, parentSku ?? null);
          return product;
        })
        .filter((product): product is Product => product !== null);

      const variantsByParentSku = new Map<string, Product[]>();
      parentBySku.forEach((parentSku, sku) => {
        if (!parentSku) {
          return;
        }

        const variant = productIndex.get(sku);
        if (!variant) {
          return;
        }

        const siblings = variantsByParentSku.get(parentSku) ?? [];
        siblings.push(variant);
        variantsByParentSku.set(parentSku, siblings);
      });

      const categoryRoot =
        ((parsed.Catalog as Record<string, unknown>)?.Website as Record<string, unknown>) ??
        (parsed.catalog as Record<string, unknown>) ??
        parsed;
      const rawCategories = normalizeArray(
        ((categoryRoot.Categories as Record<string, unknown>)?.Category ??
          categoryRoot.Categories ??
          categoryRoot.Category) as unknown,
      );

      const categories = rawCategories
        .map((entry) =>
          entry && typeof entry === "object" ? parseCategoryNode(entry as RawProduct) : null,
        )
        .filter((category): category is ProductCategory => category !== null);

      const categoryIndex = new Map<string, ProductCategory>();
      indexCategories(categories, categoryIndex);

      cachedFeedData = {
        products,
        categories,
        productIndex,
        parentBySku,
        variantsByParentSku,
        categoryIndex,
      };

      return cachedFeedData;
    })
    .finally(() => {
      cachePromise = null;
    });

  return cachePromise;
}

export async function getAllProducts(): Promise<Product[]> {
  const { products } = await loadFeedData();
  return products;
}

export async function getProductByArticleNumber(
  articleNumber: string,
): Promise<Product | null> {
  const trimmed = articleNumber.trim();
  if (!trimmed) {
    return null;
  }

  const { products } = await loadFeedData();
  return products.find((product) => product.articleNumber === trimmed) ?? null;
}

export async function getProductsByArticleNumbers(
  articleNumbers: string[],
): Promise<Product[]> {
  const targets = new Set(articleNumbers.map((value) => value.trim()).filter(Boolean));
  const { products } = await loadFeedData();

  return products.filter((product) => targets.has(product.articleNumber));
}

export async function getProductWithVariantsBySku(
  articleNumber: string,
): Promise<ProductWithVariants | null> {
  const trimmed = articleNumber.trim();
  if (!trimmed) {
    return null;
  }

  const { productIndex, variantsByParentSku, parentBySku } = await loadFeedData();
  const parentSku = parentBySku.get(trimmed);
  const resolvedParentSku = parentSku ?? trimmed;
  const parentProduct = productIndex.get(resolvedParentSku);

  if (!parentProduct) {
    return null;
  }

  return {
    ...parentProduct,
    variants: variantsByParentSku.get(resolvedParentSku) ?? [],
  } satisfies ProductWithVariants;
}

export async function getCategoryTree(): Promise<ProductCategory[]> {
  const { categories } = await loadFeedData();
  return categories;
}

export async function getTopLevelCategories(
  parentId?: string,
): Promise<ProductCategory[]> {
  const { categories, categoryIndex } = await loadFeedData();

  if (!parentId) {
    return categories;
  }

  const parentCategory = categoryIndex.get(parentId);
  return parentCategory?.children ?? [];
}

export async function getProductsForCategory(
  categoryId: string,
  options: { includeDescendants?: boolean } = {},
): Promise<ProductWithVariants[]> {
  const { includeDescendants = false } = options;
  const { categoryIndex, productIndex, variantsByParentSku, parentBySku } =
    await loadFeedData();

  const targetCategory = categoryIndex.get(categoryId);
  if (!targetCategory) {
    return [];
  }

  const skus = new Set<string>();

  const visit = (category: ProductCategory) => {
    category.productSkus.forEach((sku) => {
      if (!sku) {
        return;
      }
      if (parentBySku.get(sku) !== null) {
        return;
      }
      skus.add(sku);
    });

    if (includeDescendants) {
      category.children.forEach(visit);
    }
  };

  visit(targetCategory);

  return Array.from(skus)
    .map((sku) => {
      const product = productIndex.get(sku);
      if (!product) {
        return null;
      }

      return {
        ...product,
        variants: variantsByParentSku.get(product.articleNumber) ?? [],
      } satisfies ProductWithVariants;
    })
    .filter((entry): entry is ProductWithVariants => entry !== null);
}

import {
  getAllProducts,
  getCategoryTree,
  getFamilyMaps,
  type Product,
  type ProductCategory,
} from "./product-feed";
import { normalizeSpecKey } from "./spec-table";

export type DashboardStats = {
  totalProducts: number;
  parentProducts: number;
  variants: number;
  categories: number;
  uniqueSpecKeys: number;
};

export type DataQualityCounts = {
  missingImage: number;
  missingSpecs: number;
  missingDescription: number;
};

export type CategoryLookup = Map<string, string[]>;

export type FamilySpecIssue = {
  familySku: string;
  familyTitle: string;
  variantSku: string;
  missingKeys: string[];
};

export type DashboardData = {
  stats: DashboardStats;
  dataQualityCounts: DataQualityCounts;
  missingImageProducts: Product[];
  missingSpecsProducts: Product[];
  missingDescriptionProducts: Product[];
  familySpecIssues: FamilySpecIssue[];
  inconsistentFamilyCount: number;
  categoryLookup: CategoryLookup;
};

function createSpecMap(specs: Product["specs"]): Map<string, string> {
  return specs.reduce<Map<string, string>>((map, spec) => {
    const label = spec.key.trim();
    const value = spec.value.trim();
    if (!label || !value) {
      return map;
    }

    map.set(normalizeSpecKey(label), value);
    return map;
  }, new Map());
}

function collectCategoryPaths(categories: ProductCategory[]): CategoryLookup {
  const lookup = new Map<string, string[]>();

  const visit = (nodes: ProductCategory[], path: string[]) => {
    nodes.forEach((category) => {
      const nextPath = [...path, category.name];

      category.productSkus.forEach((sku) => {
        const entries = lookup.get(sku) ?? [];
        entries.push(nextPath.join(" / "));
        lookup.set(sku, entries);
      });

      if (category.children.length) {
        visit(category.children, nextPath);
      }
    });
  };

  visit(categories, []);
  return lookup;
}

function countCategories(categories: ProductCategory[]): number {
  let count = 0;

  const visit = (nodes: ProductCategory[]) => {
    if (!nodes.length) {
      return;
    }

    nodes.forEach((node) => {
      count += 1;
      visit(node.children);
    });
  };

  visit(categories);
  return count;
}

const PLACEHOLDER_IMAGE_URL = "https://www.nilsahlgren.se/gfx/no-image.jpg";

function findMissingImage(products: Product[]): Product[] {
  return products.filter((product) => product.image?.trim() === PLACEHOLDER_IMAGE_URL);
}

function findMissingSpecs(
  products: Product[],
  parentBySku: Map<string, string | null>,
): Product[] {
  return products.filter(
    (product) => parentBySku.get(product.articleNumber) !== null && product.specs.length === 0,
  );
}

function findMissingDescriptions(
  products: Product[],
  parentBySku: Map<string, string | null>,
): Product[] {
  return products.filter(
    (product) =>
      parentBySku.get(product.articleNumber) !== null &&
      (!product.description || !product.description.trim()),
  );
}

function resolveUniqueSpecKeys(products: Product[]): number {
  const keys = new Set<string>();
  products.forEach((product) => {
    product.specs.forEach((spec) => {
      const normalized = normalizeSpecKey(spec.key);
      if (normalized) {
        keys.add(normalized);
      }
    });
  });

  return keys.size;
}

function buildProductIndex(products: Product[]): Map<string, Product> {
  return products.reduce<Map<string, Product>>((index, product) => {
    index.set(product.articleNumber, product);
    return index;
  }, new Map());
}

function dedupeProducts(products: Product[]): Product[] {
  const index = new Map<string, Product>();
  products.forEach((product) => {
    if (!index.has(product.articleNumber)) {
      index.set(product.articleNumber, product);
    }
  });

  return Array.from(index.values());
}

function detectFamilySpecIssues(
  productIndex: Map<string, Product>,
  variantsByParentSku: Map<string, Product[]>,
): { issues: FamilySpecIssue[]; inconsistentFamilies: number } {
  const issues: FamilySpecIssue[] = [];
  let inconsistentFamilies = 0;

  variantsByParentSku.forEach((variants, parentSku) => {
    const parent = productIndex.get(parentSku);
    if (!parent || variants.length === 0) {
      return;
    }

    const specMaps = new Map<string, Map<string, string>>();
    const childKeys = new Set<string>();

    variants.forEach((variant) => {
      const map = createSpecMap(variant.specs);
      specMaps.set(variant.articleNumber, map);
      map.forEach((_value, key) => childKeys.add(key));
    });

    const familyIssues: FamilySpecIssue[] = [];

    childKeys.forEach((key) => {
      const presentCount = variants.filter((variant) => {
        const value = specMaps.get(variant.articleNumber)?.get(key);
        return value !== undefined && value.trim().length > 0;
      }).length;

      if (presentCount === 0 || presentCount === variants.length) {
        return;
      }

      variants.forEach((variant) => {
        const value = specMaps.get(variant.articleNumber)?.get(key);
        if (!value || !value.trim()) {
          familyIssues.push({
            familySku: parent.articleNumber,
            familyTitle: parent.title,
            variantSku: variant.articleNumber,
            missingKeys: [key],
          });
        }
      });
    });

    if (familyIssues.length > 0) {
      inconsistentFamilies += 1;
      issues.push(...familyIssues);
    }
  });

  return { issues, inconsistentFamilies };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [products, categories, familyMaps] = await Promise.all([
    getAllProducts(),
    getCategoryTree(),
    getFamilyMaps(),
  ]);

  const uniqueProducts = dedupeProducts(products);
  const productIndex = buildProductIndex(uniqueProducts);
  const { variantsByParentSku, parentBySku } = familyMaps;
  const categoryCount = countCategories(categories);

  const variantProducts = uniqueProducts.filter(
    (product) => parentBySku.get(product.articleNumber) !== null,
  );

  const missingImageProducts = findMissingImage(uniqueProducts);
  const missingSpecsProducts = findMissingSpecs(variantProducts, parentBySku);
  const missingDescriptionProducts = findMissingDescriptions(variantProducts, parentBySku);

  const { issues: familySpecIssues, inconsistentFamilies } = detectFamilySpecIssues(
    productIndex,
    variantsByParentSku,
  );

  const categoryLookup = collectCategoryPaths(categories);

  const uniqueSkus = new Set(uniqueProducts.map((product) => product.articleNumber));
  const parentSkus = Array.from(uniqueSkus).filter((sku) => parentBySku.get(sku) === null);
  const variantSkus = Array.from(uniqueSkus).filter((sku) => parentBySku.get(sku) !== null);

  const stats: DashboardStats = {
    totalProducts: uniqueSkus.size,
    parentProducts: parentSkus.length,
    variants: variantSkus.length,
    categories: categoryCount,
    uniqueSpecKeys: resolveUniqueSpecKeys(uniqueProducts),
  };

  const dataQualityCounts: DataQualityCounts = {
    missingImage: missingImageProducts.length,
    missingSpecs: missingSpecsProducts.length,
    missingDescription: missingDescriptionProducts.length,
  };

  return {
    stats,
    dataQualityCounts,
    missingImageProducts,
    missingSpecsProducts,
    missingDescriptionProducts,
    familySpecIssues,
    inconsistentFamilyCount: inconsistentFamilies,
    categoryLookup,
  };
}

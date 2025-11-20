import { parseSizeMetrics } from "./article-sorting";
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
  deepestCategoryLevel: number;
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

export type DimensionIssue = {
  sku: string;
  title: string;
  size: string;
  reason: string;
};

export type DashboardData = {
  stats: DashboardStats;
  dataQualityCounts: DataQualityCounts;
  missingImageProducts: Product[];
  missingSpecsProducts: Product[];
  missingDescriptionProducts: Product[];
  familySpecIssues: FamilySpecIssue[];
  inconsistentFamilyCount: number;
  dimensionIssues: DimensionIssue[];
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

function countCategoriesAndDepth(categories: ProductCategory[]): {
  count: number;
  depth: number;
} {
  let count = 0;
  let depth = 0;

  const visit = (nodes: ProductCategory[], level: number) => {
    if (!nodes.length) {
      return;
    }

    depth = Math.max(depth, level);
    nodes.forEach((node) => {
      count += 1;
      visit(node.children, level + 1);
    });
  };

  visit(categories, 1);
  return { count, depth };
}

function findMissingImage(products: Product[]): Product[] {
  return products.filter((product) => !product.image || !product.image.trim());
}

function findMissingSpecs(products: Product[]): Product[] {
  return products.filter((product) => !product.specs || product.specs.length === 0);
}

function findMissingDescriptions(products: Product[]): Product[] {
  return products.filter((product) => !product.description || !product.description.trim());
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

function detectFamilySpecIssues(
  productIndex: Map<string, Product>,
  variantsByParentSku: Map<string, Product[]>,
): { issues: FamilySpecIssue[]; inconsistentFamilies: number } {
  const issues: FamilySpecIssue[] = [];
  let inconsistentFamilies = 0;

  variantsByParentSku.forEach((variants, parentSku) => {
    const parent = productIndex.get(parentSku);
    if (!parent) {
      return;
    }

    const familyProducts = [parent, ...variants];
    const allKeys = new Set<string>();
    const specMaps = new Map<string, Map<string, string>>();

    familyProducts.forEach((product) => {
      const map = createSpecMap(product.specs);
      specMaps.set(product.articleNumber, map);
      map.forEach((_value, key) => allKeys.add(key));
    });

    const familyIssues: FamilySpecIssue[] = [];

    allKeys.forEach((key) => {
      const presentCount = familyProducts.filter((product) => {
        const value = specMaps.get(product.articleNumber)?.get(key);
        return value !== undefined && value.trim().length > 0;
      }).length;

      if (presentCount === 0 || presentCount === familyProducts.length) {
        return;
      }

      familyProducts.forEach((product) => {
        const value = specMaps.get(product.articleNumber)?.get(key);
        if (!value || !value.trim()) {
          familyIssues.push({
            familySku: parent.articleNumber,
            familyTitle: parent.title,
            variantSku: product.articleNumber,
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

function getSizeValue(specs: Product["specs"]): string {
  const map = createSpecMap(specs);
  for (const [key, value] of map.entries()) {
    if (key === "storlek") {
      return value;
    }
  }

  return "";
}

function detectDimensionIssues(
  productIndex: Map<string, Product>,
  variantsByParentSku: Map<string, Product[]>,
  parentBySku: Map<string, string | null>,
): DimensionIssue[] {
  const issues: DimensionIssue[] = [];

  const getFamilyStats = (sku: string) => {
    const parentSku = parentBySku.get(sku) ?? sku;
    const variants = variantsByParentSku.get(parentSku) ?? [];
    const parent = productIndex.get(parentSku);
    if (!parent) {
      return [] as Product[];
    }

    return [parent, ...variants];
  };

  const evaluateIssue = (product: Product) => {
    const sizeValue = getSizeValue(product.specs);
    if (!sizeValue.trim()) {
      issues.push({
        sku: product.articleNumber,
        title: product.title,
        size: "—",
        reason: "saknar storlek",
      });
      return;
    }

    const metrics = parseSizeMetrics(sizeValue);
    const { thickness, length } = metrics;

    const tooSmall =
      (thickness !== null && thickness <= 0) || (length !== null && length <= 0);
    const tooLarge =
      (thickness !== null && thickness > 10000) || (length !== null && length > 100000);

    if (thickness === null && length === null) {
      issues.push({
        sku: product.articleNumber,
        title: product.title,
        size: sizeValue,
        reason: "kan inte tolkas",
      });
      return;
    }

    if (tooSmall || tooLarge) {
      issues.push({
        sku: product.articleNumber,
        title: product.title,
        size: sizeValue,
        reason: "orimligt mått",
      });
      return;
    }

    const family = getFamilyStats(product.articleNumber);
    const numericThickness = family
      .map((entry) => parseSizeMetrics(getSizeValue(entry.specs)).thickness)
      .filter((value): value is number => value !== null && value > 0 && value < 10000);

    if (numericThickness.length >= 2 && thickness !== null && thickness > 0) {
      const average =
        numericThickness.reduce((sum, value) => sum + value, 0) / numericThickness.length;
      const deviation = Math.abs(thickness - average) / average;

      if (deviation > 0.6) {
        issues.push({
          sku: product.articleNumber,
          title: product.title,
          size: sizeValue,
          reason: "avviker från familjens intervall",
        });
      }
    }
  };

  productIndex.forEach((product) => evaluateIssue(product));

  return issues;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [products, categories, familyMaps] = await Promise.all([
    getAllProducts(),
    getCategoryTree(),
    getFamilyMaps(),
  ]);

  const productIndex = buildProductIndex(products);
  const { variantsByParentSku, parentBySku } = familyMaps;
  const { count: categoryCount, depth: categoryDepth } =
    countCategoriesAndDepth(categories);

  const missingImageProducts = findMissingImage(products);
  const missingSpecsProducts = findMissingSpecs(products);
  const missingDescriptionProducts = findMissingDescriptions(products);

  const { issues: familySpecIssues, inconsistentFamilies } = detectFamilySpecIssues(
    productIndex,
    variantsByParentSku,
  );

  const dimensionIssues = detectDimensionIssues(
    productIndex,
    variantsByParentSku,
    parentBySku,
  );

  const categoryLookup = collectCategoryPaths(categories);

  const stats: DashboardStats = {
    totalProducts: products.length,
    parentProducts: Array.from(parentBySku.values()).filter((value) => value === null).length,
    variants: Array.from(parentBySku.values()).filter((value) => value !== null).length,
    categories: categoryCount,
    deepestCategoryLevel: categoryDepth,
    uniqueSpecKeys: resolveUniqueSpecKeys(products),
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
    dimensionIssues,
    categoryLookup,
  };
}

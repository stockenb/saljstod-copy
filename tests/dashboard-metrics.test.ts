import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardData } from "../lib/dashboard-metrics";
import { getAllProducts, getFamilyMaps } from "../lib/product-feed";
import { normalizeSpecKey } from "../lib/spec-table";

const PLACEHOLDER_IMAGE_URL = "https://www.nilsahlgren.se/gfx/no-image.jpg";

test("dashboard counts are based on unique SKUs", async () => {
  const [products, dashboard] = await Promise.all([getAllProducts(), getDashboardData()]);
  const uniqueSkus = new Set(products.map((product) => product.articleNumber));

  assert.equal(
    dashboard.stats.totalProducts,
    uniqueSkus.size,
    "totalProducts should count unique SKUs",
  );

  assert.equal(
    dashboard.stats.parentProducts + dashboard.stats.variants,
    uniqueSkus.size,
    "parents + variants should equal total unique SKUs",
  );
});

test("missing image uses placeholder definition", async () => {
  const dashboard = await getDashboardData();

  assert.equal(
    dashboard.dataQualityCounts.missingImage,
    dashboard.missingImageProducts.length,
    "missing image count should match list length",
  );

  dashboard.missingImageProducts.forEach((product) => {
    assert.equal(
      product.image?.trim(),
      PLACEHOLDER_IMAGE_URL,
      "products without image should use the placeholder URL",
    );
  });
});

test("variant-only issues exclude parent products", async () => {
  const [dashboard, familyMaps] = await Promise.all([getDashboardData(), getFamilyMaps()]);
  const { parentBySku } = familyMaps;

  const expectVariants = (skus: string[], label: string) => {
    skus.forEach((sku) => {
      assert.notEqual(
        parentBySku.get(sku),
        null,
        `${label} should only include variants (non-parent SKUs)`,
      );
    });
  };

  expectVariants(
    dashboard.missingSpecsProducts.map((product) => product.articleNumber),
    "missing specs",
  );
  expectVariants(
    dashboard.missingDescriptionProducts.map((product) => product.articleNumber),
    "missing descriptions",
  );
  expectVariants(
    dashboard.familySpecIssues.map((issue) => issue.variantSku),
    "families",
  );
});

test("family spec issues are based on child specs only", async () => {
  const [dashboard, familyMaps, products] = await Promise.all([
    getDashboardData(),
    getFamilyMaps(),
    getAllProducts(),
  ]);

  const { parentBySku, variantsByParentSku } = familyMaps;
  const productIndex = new Map(products.map((product) => [product.articleNumber, product]));

  assert.ok(dashboard.familySpecIssues.length > 0, "should find at least one family issue");

  dashboard.familySpecIssues.forEach((issue) => {
    const parentSku = parentBySku.get(issue.variantSku);
    assert.notEqual(parentSku, null, "family issues should reference a variant with a parent");

    const variants = variantsByParentSku.get(parentSku as string) ?? [];
    const childKeys = new Set<string>();

    variants.forEach((variant) => {
      const product = productIndex.get(variant.articleNumber);
      product?.specs.forEach((spec) => {
        const normalizedKey = normalizeSpecKey(spec.key);
        if (normalizedKey && spec.value.trim()) {
          childKeys.add(normalizedKey);
        }
      });
    });

    issue.missingKeys.forEach((missingKey) => {
      assert.ok(
        childKeys.has(missingKey),
        `missing key ${missingKey} should exist on at least one child in the family`,
      );
    });
  });
});

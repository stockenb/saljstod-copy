import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardData } from "../lib/dashboard-metrics";
import { getAllProducts, getFamilyMaps } from "../lib/product-feed";

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
    dashboard.dimensionIssues.map((issue) => issue.sku),
    "dimension issues",
  );
});

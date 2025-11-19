import assert from "node:assert/strict";
import test from "node:test";

import { filterCatalogProducts } from "../lib/catalog-filters";
import type { ProductWithVariants } from "../lib/product-feed";

function createProduct(overrides: Partial<ProductWithVariants> = {}): ProductWithVariants {
  return {
    articleNumber: "100",
    title: "Parent",
    link: "#",
    image: "",
    description: "",
    weight: "",
    specs: [],
    primaryPackaging: "Hink",
    variants: [
      {
        articleNumber: "101",
        title: "Bucket variant",
        link: "#",
        image: "",
        description: "",
        weight: "",
        specs: [],
        primaryPackaging: "Hink",
      },
      {
        articleNumber: "102",
        title: "Package variant",
        link: "#",
        image: "",
        description: "",
        weight: "",
        specs: [],
        primaryPackaging: "Paket",
      },
    ],
    ...overrides,
  };
}

test("filterCatalogProducts respects packaging filters", () => {
  const [product] = filterCatalogProducts([createProduct()], { packagingFilters: ["bucket"] });

  assert.ok(product, "product should remain after filtering");
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0]?.articleNumber, "101");
});

test("exclusion removes matching variants", () => {
  const [product] = filterCatalogProducts([createProduct()], { excludeSkus: ["101"] });

  assert.ok(product);
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0]?.articleNumber, "102");
});

test("excluding parent removes entire product", () => {
  const result = filterCatalogProducts([createProduct()], { excludeSkus: ["100"] });

  assert.equal(result.length, 0);
});

test("included SKUs bypass packaging filters", () => {
  const [product] = filterCatalogProducts([createProduct()], {
    packagingFilters: ["bucket"],
    includeSkus: ["102"],
  });

  assert.ok(product);
  assert.equal(product.variants.length, 2, "both variants should remain");
});

test("solo articles can be forced back in", () => {
  const solo = createProduct({
    articleNumber: "200",
    primaryPackaging: "Paket",
    variants: [],
  });

  const filtered = filterCatalogProducts([solo], { packagingFilters: ["bucket"] });
  assert.equal(filtered.length, 0, "product should be filtered out");

  const forced = filterCatalogProducts([solo], {
    packagingFilters: ["bucket"],
    includeSkus: ["200"],
  });
  assert.equal(forced.length, 1, "product should be reintroduced via inclusion list");
});

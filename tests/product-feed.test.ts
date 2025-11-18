import assert from "node:assert/strict";
import test from "node:test";

import {
  getCategoryTree,
  getProductsForCategory,
} from "../lib/product-feed";

test("getCategoryTree parses categories", async () => {
  const categories = await getCategoryTree();

  assert.ok(Array.isArray(categories));
  assert.ok(categories.length > 0, "should return at least one category");
  assert.ok(categories[0]?.id, "categories should include an id");
});

test("getProductsForCategory returns parents with variants", async () => {
  const categories = await getCategoryTree();
  const targetCategory =
    categories.find((category) => category.children.length > 0) ?? categories[0];

  assert.ok(targetCategory, "a target category should exist");

  const products = await getProductsForCategory(targetCategory.id, {
    includeDescendants: true,
  });

  assert.ok(products.length > 0, "should return at least one product");
  const [first] = products;
  assert.ok(first?.variants !== undefined, "variants should be included");
});

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
  const findWithChildren = (nodes: typeof categories): (typeof categories)[number] | undefined => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        return node;
      }
      const match = findWithChildren(node.children);
      if (match) return match;
    }
    return undefined;
  };
  const targetCategory = findWithChildren(categories) ?? categories[0];

  assert.ok(targetCategory, "a target category should exist");

  const products = await getProductsForCategory(targetCategory.id, {
    includeDescendants: true,
  });

  assert.ok(products.length > 0, "should return at least one product");
  const [first] = products;
  assert.ok(first?.variants !== undefined, "variants should be included");
});

test("getProductsForCategory includes descendants when requested", async () => {
  const categories = await getCategoryTree();

  const findWithChildren = (nodes: typeof categories): (typeof categories)[number] | undefined => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        return node;
      }
      const match = findWithChildren(node.children);
      if (match) return match;
    }
    return undefined;
  };

  const categoryWithChildren = findWithChildren(categories);
  assert.ok(categoryWithChildren, "a category with descendants should exist in the feed");

  const directProducts = await getProductsForCategory(categoryWithChildren!.id, {
    includeDescendants: false,
  });
  const descendantProducts = await getProductsForCategory(categoryWithChildren!.id, {
    includeDescendants: true,
  });

  assert.ok(
    descendantProducts.length >= directProducts.length,
    "descendant fetch should include at least as many products as direct fetch",
  );
});

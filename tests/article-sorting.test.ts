import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSortableArticle,
  compareSortableArticles,
} from "../lib/article-sorting";
import { normalizeSpecKey } from "../lib/spec-table";

function mapFromObject(entries: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(entries));
}

test("sorts by size thickness then length", () => {
  const entries = [
    { articleNumber: "F", sizeValue: "5,5x50", packaging: null },
    { articleNumber: "A", sizeValue: "3,5x40", packaging: null },
    { articleNumber: "B", sizeValue: "3,5x60", packaging: null },
    { articleNumber: "C", sizeValue: "4x40", packaging: null },
    { articleNumber: "D", sizeValue: "4x100", packaging: null },
    { articleNumber: "E", sizeValue: "5x30", packaging: null },
  ];

  const sorted = entries
    .map((entry) =>
      buildSortableArticle(
        { ...entry, specMap: new Map() },
        normalizeSpecKey,
      ),
    )
    .sort(compareSortableArticles);

  assert.deepEqual(
    sorted.map((entry) => entry.articleNumber),
    ["A", "B", "C", "D", "E", "F"],
  );
});

test("sorts packaging types when size is equal", () => {
  const sizeValue = "4x40";
  const entries = [
    { articleNumber: "H", packaging: "Kartong" },
    { articleNumber: "S", packaging: "SB förpackning" },
    { articleNumber: "P", packaging: "Paket" },
    { articleNumber: "K", packaging: "Hink" },
  ];

  const sorted = entries
    .map((entry) =>
      buildSortableArticle(
        { ...entry, sizeValue, specMap: new Map() },
        normalizeSpecKey,
      ),
    )
    .sort(compareSortableArticles);

  assert.deepEqual(sorted.map((entry) => entry.articleNumber), ["S", "P", "K", "H"]);
});

test("sorts by packaging quantity when size and type match", () => {
  const sizeValue = "4x40";
  const packaging = "Hink";
  const entries = [
    { articleNumber: "Q2", quantity: "200 st" },
    { articleNumber: "Q1", quantity: "50 st" },
  ];

  const sorted = entries
    .map((entry) =>
      buildSortableArticle(
        {
          articleNumber: entry.articleNumber,
          sizeValue,
          packaging,
          specMap: mapFromObject({ Antal: entry.quantity }),
        },
        normalizeSpecKey,
      ),
    )
    .sort(compareSortableArticles);

  assert.deepEqual(sorted.map((entry) => entry.articleNumber), ["Q1", "Q2"]);
});

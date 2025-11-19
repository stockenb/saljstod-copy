import assert from "node:assert/strict";
import test from "node:test";

import {
  collectSpecColumns,
  formatSpecValue,
  getSpecValueForColumn,
  normalizeSpecKey,
  shouldIncludeSpecColumn,
  type ProductSpecification,
} from "../lib/spec-table";

const baseSpecs: ProductSpecification[] = [
  { key: "EAN-kod", value: "111" },
  { key: "Vikt", value: "1 kg" },
  { key: "Benämning engelska", value: "English name" },
  { key: "Coating", value: "coated" },
  { key: "Ytbehandling", value: "treated" },
  { key: "Benämning", value: "repeat" },
  { key: "Antal i primärförpackning", value: "1" },
  { key: "Primärförpackning", value: "Styck" },
  { key: "SB förpackning", value: "Styck" },
  { key: "Färg", value: "Röd" },
];

test("spec filtering hides unwanted keys", () => {
  const allowed = baseSpecs.filter(shouldIncludeSpecColumn);

  const allowedKeys = allowed.map((spec) => normalizeSpecKey(spec.key));
  assert.ok(!allowedKeys.includes("ean-kod"));
  assert.ok(!allowedKeys.includes("vikt"));
  assert.ok(!allowedKeys.includes("benämning engelska"));
  assert.ok(!allowedKeys.includes("coating"));
  assert.ok(!allowedKeys.includes("ytbehandling"));
  assert.ok(!allowedKeys.includes("benämning"));
});

test("collectSpecColumns excludes Benämning column", () => {
  const columns = collectSpecColumns([
    { specs: [{ key: "Benämning", value: "Test" }] },
  ]);

  assert.equal(columns.length, 0);
});

test("spec columns map labels and values", () => {
  const columns = collectSpecColumns([
    { specs: baseSpecs },
    { specs: [{ key: "Antal i primärförpackning", value: "5" }] },
  ]);

  const labels = columns.map((col) => col.label);
  assert.ok(labels.includes("Antal"));
  assert.ok(labels.includes("Förp."));
  assert.ok(labels.includes("Småpack"));

  const container = { specs: baseSpecs };
  const packagingColumn = columns.find((column) => column.label === "Förp.");
  assert.ok(packagingColumn, "packaging column should exist");

  const value = getSpecValueForColumn(container, packagingColumn);
  assert.equal(formatSpecValue(value), "st");
});

test("packaging count of one is ignored", () => {
  const columns = collectSpecColumns([
    { specs: [{ key: "Antal i primärförpackning", value: "1" }] },
    { specs: [{ key: "Antal i primärförpackning", value: "6" }] },
  ]);

  const labels = columns.map((col) => col.label);
  assert.deepEqual(labels, ["Antal"]);
});

test("Storlek column is prioritized and uses spec value", () => {
  const specs: ProductSpecification[] = [
    { key: "Färg", value: "Svart" },
    { key: "Variant", value: "Varmförzinkad" },
    { key: "Storlek", value: "5,5x60 mm" },
  ];

  const columns = collectSpecColumns([{ specs }], 1);
  assert.equal(columns[0]?.label, "Storlek");
  assert.equal(columns.length, 2, "Storlek ska inte räknas mot maxkolumner");

  const storlekColumn = columns[0];
  assert.ok(storlekColumn);

  const value = getSpecValueForColumn({ specs }, storlekColumn);
  assert.equal(value, "5,5x60 mm");
});

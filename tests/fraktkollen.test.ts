import assert from "node:assert/strict";
import test from "node:test";

import { matchAndCompute, normalizeNumber, validateColumns } from "../lib/fraktkollen";

test("normalizeNumber handles Swedish and international number formats", () => {
  assert.equal(normalizeNumber("1 234,56"), 1234.56);
  assert.equal(normalizeNumber("1.234,56"), 1234.56);
  assert.equal(normalizeNumber("1,234.56"), 1234.56);
  assert.equal(normalizeNumber("1234.56"), 1234.56);
});

test("validateColumns reports missing columns", () => {
  const result = validateColumns([{ Ordernummer: "100", Belopp: "10" }], ["Ordernummer", "Kundnamn"]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingColumns, ["Kundnamn"]);
});

test("matchAndCompute aggregates monitor rows by order", () => {
  const sendifyRows = [
    { SENDER_REFERENCE: "1001", PRICE: "100,00" },
    { SENDER_REFERENCE: "1002", PRICE: "40" },
  ];

  const monitorRows = [
    { Ordernummer: "1001", Kundnamn: "Kund AB", "Benämning": "Stolpe", Belopp: "130,00" },
    { Ordernummer: "1001", Kundnamn: "Kund AB", "Benämning": "Nät", Belopp: "20,00" },
    { Ordernummer: "1003", Kundnamn: "Annan", "Benämning": "Skruv", Belopp: "15" },
  ];

  const result = matchAndCompute(sendifyRows, monitorRows);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]?.ordernummer, "1001");
  assert.equal(result.rows[0]?.belopp, 150);
  assert.equal(result.rows[0]?.tackningsbidrag, 50);
  assert.deepEqual(result.unmatchedSendifyReferences, ["1002"]);
  assert.deepEqual(result.unmatchedMonitorOrders, ["1003"]);
});

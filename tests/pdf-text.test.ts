import assert from "node:assert/strict";
import test from "node:test";

import { normalizePdfText } from "../lib/pdf-text";

test("normalizePdfText replaces mu and diameter symbols", () => {
  const input = "Beläggning 5 μm och Ø16";
  const result = normalizePdfText(input);

  assert.equal(result, "Beläggning 5 mym och diameter16");
});

test("normalizePdfText leaves ordinary text intact", () => {
  const input = "Galvat stål";
  assert.equal(normalizePdfText(input), input);
});

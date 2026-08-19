import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptText } from "./receiptParser";

test("extracts merchant, final total and a Mexican day-first date", () => {
  const result = parseReceiptText([
    "WALMART SUPERCENTER",
    "RFC ABC123456XYZ",
    "FECHA 18/08/2026 14:32",
    "SUBTOTAL $1,100.00",
    "TOTAL $ 1,250.50",
  ]);

  assert.deepEqual(result, {
    merchant: "WALMART SUPERCENTER",
    amount: 1250.5,
    date: "2026-08-18",
  });
});

test("supports year-first dates and falls back to the largest monetary value", () => {
  const result = parseReceiptText([
    "CAFÉ CENTRAL",
    "2026-08-17",
    "LATTE $75.00",
    "PASTEL $95.00",
  ]);

  assert.equal(result.merchant, "CAFÉ CENTRAL");
  assert.equal(result.amount, 95);
  assert.equal(result.date, "2026-08-17");
});

test("rejects impossible calendar dates", () => {
  const result = parseReceiptText([
    "TIENDA LOCAL",
    "FECHA 31/02/2026",
    "TOTAL $50.00",
  ]);
  assert.equal(result.date, null);
});

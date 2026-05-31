import assert from "node:assert/strict";
import test from "node:test";
import { classifyText, parseFinance, parseFoodText, parseHabit } from "../src/parser.js";

test("classifies command types", () => {
  assert.equal(classifyText("/register https://docs.google.com/spreadsheets/d/abc/edit"), "register");
  assert.equal(classifyText("expense 45000 food nasi padang"), "finance");
  assert.equal(classifyText("income 500000 freelance desain logo"), "finance");
  assert.equal(classifyText("habit reading done 20 pages"), "habit");
  assert.equal(classifyText("food lunch nasi padang 1 porsi"), "food_text");
});

test("parses short finance input", () => {
  const parsed = parseFinance("expense 45000 food nasi padang");
  assert.equal(parsed.type, "expense");
  assert.equal(parsed.amount, 45000);
  assert.equal(parsed.category, "food");
  assert.equal(parsed.description, "nasi padang");
});

test("parses key-value finance input", () => {
  const parsed = parseFinance(`expense
date: 2026-05-31
category: food
description: nasi padang
amount: Rp45.000`);

  assert.equal(parsed.date, "2026-05-31");
  assert.equal(parsed.category, "food");
  assert.equal(parsed.description, "nasi padang");
  assert.equal(parsed.amount, 45000);
});

test("parses habit input", () => {
  const parsed = parseHabit("habit reading done 20 pages");
  assert.equal(parsed.habit, "reading");
  assert.equal(parsed.status, "done");
  assert.equal(parsed.value, "20");
  assert.equal(parsed.unit, "pages");
});

test("parses food input", () => {
  const parsed = parseFoodText("food lunch nasi padang 1 porsi");
  assert.equal(parsed.meal, "lunch");
  assert.equal(parsed.food_item, "nasi padang");
  assert.equal(parsed.serving, "1");
  assert.equal(parsed.unit, "porsi");
});


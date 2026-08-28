import { POETRY_BANK } from "../lib/poetry-bank.ts";

const ids = new Set();
const pairs = new Set();
const errors = [];
const distribution = {};

for (const poem of POETRY_BANK) {
  if (ids.has(poem.id)) errors.push(`duplicate id: ${poem.id}`);
  ids.add(poem.id);
  const pair = `${poem.upper}|${poem.lower}`;
  if (pairs.has(pair)) errors.push(`duplicate pair: ${poem.id}`);
  pairs.add(pair);
  if (!poem.upper.trim() || !poem.lower.trim()) errors.push(`empty line: ${poem.id}`);
  if (!poem.title || !poem.author || !poem.dynasty) errors.push(`missing attribution: ${poem.id}`);
  if (poem.grade < 1 || poem.grade > 6) errors.push(`invalid grade: ${poem.id}`);
  const key = `${poem.grade}年级${poem.term}`;
  distribution[key] = (distribution[key] || 0) + 1;
}

for (let grade = 1; grade <= 6; grade += 1) {
  for (const term of ["上册", "下册"]) {
    if (!distribution[`${grade}年级${term}`]) errors.push(`missing coverage: ${grade}年级${term}`);
  }
}

if (POETRY_BANK.length < 75) errors.push(`expected at least 75 entries, got ${POETRY_BANK.length}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`PASS: ${POETRY_BANK.length} poetry entries with unique IDs and line pairs`);
console.log(`PASS: all 12 grade/term books have candidate coverage`);
console.log(`PENDING: ${POETRY_BANK.filter((item) => item.reviewStatus === "needs-textbook-review").length} entries require human textbook review before public release`);
console.log(JSON.stringify(distribution, null, 2));

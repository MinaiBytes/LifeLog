import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timeZone = process.env.ENTRY_TIME_ZONE || 'Asia/Tokyo';
const date = process.env.ENTRY_DATE || today(timeZone);
const title = process.env.ENTRY_TITLE?.trim();
const body = process.env.ENTRY_BODY?.trim();

function today(zone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function escapeFrontMatter(value) {
  return value.replaceAll('"', '\\"');
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  throw new Error('ENTRY_DATE must be YYYY-MM-DD.');
}

if (!title) {
  throw new Error('ENTRY_TITLE is required.');
}

if (!body) {
  throw new Error('ENTRY_BODY is required.');
}

const [year, month, day] = date.split('-');
const entryPath = path.join(root, 'entries', year, month, `${day}.md`);

if (existsSync(entryPath)) {
  throw new Error(`${path.relative(root, entryPath)} already exists.`);
}

await mkdir(path.dirname(entryPath), { recursive: true });
await writeFile(
  entryPath,
  `---\ndate: ${date}\ntitle: "${escapeFrontMatter(title)}"\n---\n\n${body}\n`,
);

console.log(`Created ${path.relative(root, entryPath)}`);

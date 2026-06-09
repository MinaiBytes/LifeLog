import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entriesDir = path.join(root, 'entries');

async function collectMarkdownFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  const items = await readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...(await collectMarkdownFiles(itemPath)));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      files.push(itemPath);
    }
  }

  return files;
}

function parseFrontMatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error(`${filePath} must start with YAML front matter.`);
  }

  return Object.fromEntries(
    match[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        if (separator === -1) {
          throw new Error(`${filePath} has invalid front matter line: ${line}`);
        }

        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const files = await collectMarkdownFiles(entriesDir);
const dates = new Set();

for (const file of files) {
  const relativePath = path.relative(root, file);
  const frontMatter = parseFrontMatter(await readFile(file, 'utf8'), relativePath);
  const dateParts = frontMatter.date?.split('-') ?? [];
  const expectedPath = dateParts.length === 3 ? path.join('entries', dateParts[0], dateParts[1], `${dateParts[2]}.md`) : '';

  if (!frontMatter.date || !/^\d{4}-\d{2}-\d{2}$/.test(frontMatter.date)) {
    throw new Error(`${relativePath} needs date in YYYY-MM-DD format.`);
  }

  if (!frontMatter.title) {
    throw new Error(`${relativePath} needs title.`);
  }

  if (dates.has(frontMatter.date)) {
    throw new Error(`Duplicate entry date: ${frontMatter.date}`);
  }
  dates.add(frontMatter.date);

  if (relativePath !== expectedPath) {
    throw new Error(`${relativePath} should be ${expectedPath}.`);
  }
}

console.log(`Checked ${files.length} entries.`);

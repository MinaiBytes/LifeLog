import { mkdir, readFile, readdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const entriesDir = path.join(root, 'entries');
const outDir = path.join(root, 'dist');
const styleSource = path.join(root, 'src', 'styles.css');
const siteTitle = 'LifeLog';
const siteDescription = '短いタイトルと短い本文だけで、日々の思考や出来事を残していくライフログ。';
const basePath = normalizeBasePath(process.env.BASE_PATH ?? '/');

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return '/';
  }

  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

function href(urlPath) {
  const normalizedPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  return `${basePath}${normalizedPath}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function parseFrontMatterValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).replaceAll(`\\${quote}`, quote);
  }

  return trimmed;
}

function parseEntry(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error(`${filePath} must start with YAML front matter.`);
  }

  const frontMatter = Object.fromEntries(
    match[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        if (separator === -1) {
          throw new Error(`${filePath} has invalid front matter line: ${line}`);
        }

        return [line.slice(0, separator).trim(), parseFrontMatterValue(line.slice(separator + 1))];
      }),
  );

  if (!frontMatter.date || !/^\d{4}-\d{2}-\d{2}$/.test(frontMatter.date)) {
    throw new Error(`${filePath} needs date in YYYY-MM-DD format.`);
  }

  if (!frontMatter.title) {
    throw new Error(`${filePath} needs title.`);
  }

  const [year, month, day] = frontMatter.date.split('-');

  return {
    date: frontMatter.date,
    title: frontMatter.title,
    body: match[2].trim(),
    sourcePath: filePath,
    year,
    month,
    day,
    urlPath: `/entries/${year}/${month}/${day}/`,
  };
}

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

function plainText(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[>*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(markdown, maxLength = 120) {
  const text = plainText(markdown);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdown(markdown) {
  if (!markdown) {
    return '<p>本文はまだありません。</p>';
  }

  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();

      if (trimmed.startsWith('## ')) {
        return `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
      }

      if (trimmed.startsWith('- ')) {
        const items = trimmed
          .split('\n')
          .filter((line) => line.startsWith('- '))
          .map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      return `<p>${renderInlineMarkdown(trimmed).replaceAll('\n', '<br>')}</p>`;
    })
    .join('\n');
}

function groupBy(entries, key) {
  return entries.reduce((groups, entry) => {
    const value = key(entry);
    groups.set(value, [...(groups.get(value) ?? []), entry]);
    return groups;
  }, new Map());
}

function page({ title, description = siteDescription, body, currentPath = '/' }) {
  const fullTitle = title === siteTitle ? siteTitle : `${title} | ${siteTitle}`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(fullTitle)}</title>
  <link rel="stylesheet" href="${href('/styles.css')}">
</head>
<body>
  <div class="site">
    <header class="site-header">
      <h1 class="site-title"><a href="${href('/')}">${escapeHtml(siteTitle)}</a></h1>
      <nav class="site-nav" aria-label="主要ナビゲーション">
        <a href="${href('/')}">最新</a>
        <a href="${href('/archives/')}">アーカイブ</a>
      </nav>
    </header>
    <main aria-label="${escapeHtml(title)}" data-path="${escapeHtml(currentPath)}">
${body}
    </main>
    <footer class="site-footer">
      <p>短くても、毎日でなくても、生きた記録を残す場所。</p>
    </footer>
  </div>
</body>
</html>`;
}

function entryList(entries, { showExcerpt = false } = {}) {
  if (entries.length === 0) {
    return '<p>まだ記録がありません。</p>';
  }

  return `<ul class="entry-list${showExcerpt ? ' entry-list-with-excerpts' : ''}">
${entries
  .map((entry) => {
    const preview = showExcerpt ? `
      <p class="entry-excerpt">${escapeHtml(excerpt(entry.body))}</p>` : '';

    return `  <li>
    <a class="entry-link" href="${href(entry.urlPath)}">
      <span class="entry-link-main">
        <strong>${escapeHtml(entry.title)}</strong>${preview}
      </span>
      <time datetime="${entry.date}">${formatDate(entry.date)}</time>
    </a>
  </li>`;
  })
  .join('\n')}
</ul>`;
}

async function writePage(urlPath, html) {
  const target = path.join(outDir, urlPath, 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
}

async function build() {
  const markdownFiles = await collectMarkdownFiles(entriesDir);
  const entries = await Promise.all(
    markdownFiles.map(async (file) => parseEntry(await readFile(file, 'utf8'), path.relative(root, file))),
  );

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const duplicateDates = entries.filter((entry, index) => entries.findIndex((item) => item.date === entry.date) !== index);
  if (duplicateDates.length > 0) {
    throw new Error(`Duplicate entry dates are not supported yet: ${duplicateDates.map((entry) => entry.date).join(', ')}`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await copyFile(styleSource, path.join(outDir, 'styles.css'));
  await writeFile(path.join(outDir, '.nojekyll'), '');

  await writePage(
    '',
    page({
      title: siteTitle,
      body: `      <section class="hero">
        <p>${escapeHtml(siteDescription)}</p>
        <p>思ったことを、短く書き残していきます。</p>
      </section>
      <h2 class="section-title">最新の記録</h2>
${entryList(entries.slice(0, 30), { showExcerpt: true })}`,
    }),
  );

  const years = [...groupBy(entries, (entry) => entry.year).entries()].sort(([a], [b]) => b.localeCompare(a));
  await writePage(
    'archives',
    page({
      title: 'アーカイブ',
      currentPath: '/archives/',
      body: `      <h2 class="section-title">年別アーカイブ</h2>
      <ul class="archive-list">
${years
  .map(([year, yearEntries]) => `        <li><a href="${href(`/archives/${year}/`)}">${year}年</a> <span class="count">${yearEntries.length}件</span></li>`)
  .join('\n')}
      </ul>`,
    }),
  );

  for (const [year, yearEntries] of years) {
    const months = [...groupBy(yearEntries, (entry) => entry.month).entries()].sort(([a], [b]) => b.localeCompare(a));
    await writePage(
      `archives/${year}`,
      page({
        title: `${year}年`,
        currentPath: `/archives/${year}/`,
        body: `      <h2 class="section-title">${year}年</h2>
      <ul class="month-list">
${months
  .map(([month, monthEntries]) => `        <li><a href="${href(`/archives/${year}/${month}/`)}">${Number(month)}月</a> <span class="count">${monthEntries.length}件</span></li>`)
  .join('\n')}
      </ul>
      <p><a class="back-link" href="${href('/archives/')}">アーカイブへ戻る</a></p>`,
      }),
    );

    for (const [month, monthEntries] of months) {
      await writePage(
        `archives/${year}/${month}`,
        page({
          title: `${year}年${Number(month)}月`,
          currentPath: `/archives/${year}/${month}/`,
          body: `      <h2 class="section-title">${year}年${Number(month)}月</h2>
${entryList(monthEntries, { showExcerpt: true })}
      <p><a class="back-link" href="${href(`/archives/${year}/`)}">${year}年へ戻る</a></p>`,
        }),
      );
    }
  }

  const chronological = [...entries].reverse();
  for (const entry of entries) {
    const index = chronological.findIndex((item) => item.date === entry.date);
    const previous = chronological[index - 1];
    const next = chronological[index + 1];

    await writePage(
      `entries/${entry.year}/${entry.month}/${entry.day}`,
      page({
        title: entry.title,
        description: `${formatDate(entry.date)} - ${entry.title}`,
        currentPath: entry.urlPath,
        body: `      <article class="entry-card">
        <p class="entry-date"><time datetime="${entry.date}">${formatDate(entry.date)}</time></p>
        <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
        <div class="entry-body">
${renderMarkdown(entry.body)}
        </div>
      </article>
      <nav class="pager" aria-label="前後の記録">
        ${previous ? `<a href="${href(previous.urlPath)}">← ${escapeHtml(previous.title)}</a>` : '<span></span>'}
        ${next ? `<a href="${href(next.urlPath)}">${escapeHtml(next.title)} →</a>` : '<span></span>'}
      </nav>`,
      }),
    );
  }

  console.log(`Built ${entries.length} entries into ${path.relative(root, outDir)}/`);
}

await build();

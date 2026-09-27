/**
 * Obsidian → Hexo 内容兼容：
 * 1) ![[img.png]] / ![[img.png|400]] 维基图片（Obsidian 可预览）
 * 2) [[笔记名]] 维基链接
 * 3) > [!note] Callout
 * 4) 把 ](../img/...) 相对路径在发布时校正为 /img/...
 */

'use strict';

const fs = require('fs');
const path = require('path');

function encodePath(p) {
  return p
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function findImageInSource(hexo, fileName) {
  const base = hexo.source_dir;
  const candidates = [
    path.join(base, 'img', 'library', fileName),
    path.join(base, 'img', fileName),
    path.join(base, 'img', 'library', path.basename(fileName)),
    path.join(base, 'img', path.basename(fileName))
  ];

  for (const abs of candidates) {
    if (fs.existsSync(abs)) {
      const rel = abs
        .slice(base.length)
        .replace(/\\/g, '/')
        .replace(/^\//, '');
      return `/${rel}`;
    }
  }

  // 在 source/img 下按文件名兜底搜索一层子目录
  const imgRoot = path.join(base, 'img');
  if (fs.existsSync(imgRoot)) {
    const want = path.basename(fileName).toLowerCase();
    const stack = [imgRoot];
    while (stack.length) {
      const dir = stack.pop();
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (ent.name.toLowerCase() === want) {
          const rel = full
            .slice(base.length)
            .replace(/\\/g, '/')
            .replace(/^\//, '');
          return `/${rel}`;
        }
      }
    }
  }

  return null;
}

function resolveImagePath(hexo, raw) {
  let p = String(raw || '').trim().replace(/\\/g, '/');
  if (!p) return p;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:')) return p;

  p = p.replace(/^source\//, '');

  // 已是站点绝对路径
  if (p.startsWith('/img/')) return encodePath(p);
  if (p.startsWith('/')) return encodePath(p);

  // 相对路径 ../img/xx 或 img/xx
  if (p.startsWith('../img/')) {
    return encodePath(p.replace(/^\.\.\//, '/'));
  }
  if (p.startsWith('img/')) {
    return encodePath(`/${p}`);
  }

  const found = findImageInSource(hexo, p);
  if (found) return encodePath(found);

  // 默认落到统一图片库（新粘贴的图）
  if (!p.includes('/')) {
    return encodePath(`/img/library/${p}`);
  }

  return encodePath(`/img/library/${path.basename(p)}`);
}

function convertWikiImages(hexo, content) {
  return content.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, imgPath, opt) => {
    const src = resolveImagePath(hexo, imgPath);
    const alt = imgPath.trim().split('/').pop();
    const option = (opt || '').trim();

    if (/^\d+$/.test(option)) {
      return `<img src="${src}" alt="${alt}" width="${option}" loading="lazy" />`;
    }
    if (option) {
      return `<img src="${src}" alt="${option}" loading="lazy" />`;
    }
    return `![${alt}](${src})`;
  });
}

function convertMarkdownImgRel(content) {
  // 兼容 ](../img/xxx) 与 ](../../source/img/xxx) 误写
  return content
    .replace(/\]\((?:\.\.\/)+img\//g, '](/img/')
    .replace(/\]\((?:\.\.\/)*source\/img\//g, '](/img/');
}

function convertWikiLinks(content, postMap) {
  return content.replace(/(^|[^!])\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (full, prefix, target, alias) => {
    const name = target.trim();
    const text = (alias || name).trim();
    const hit = postMap.get(name) || postMap.get(name.replace(/\.md$/i, ''));
    if (hit) {
      return `${prefix}[${text}](${hit})`;
    }
    return `${prefix}<span class="wiki-unresolved">${text}</span>`;
  });
}

function convertCallouts(content) {
  const lines = content.split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const m = lines[i].match(/^>\s*\[!([A-Za-z0-9_-]+)\]\s*(.*)$/);
    if (!m) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const type = m[1].toLowerCase();
    const title = (m[2] || type).trim();
    const body = [];
    i += 1;
    while (i < lines.length && /^>/.test(lines[i])) {
      body.push(lines[i].replace(/^>\s?/, ''));
      i += 1;
    }

    const bodyHtml = body.length
      ? body.map((line) => (line.trim() ? `<p>${line}</p>` : '')).join('\n')
      : '';

    out.push(
      [
        `<div class="callout callout-${type}" data-callout="${type}">`,
        `  <div class="callout-title">${title}</div>`,
        `  <div class="callout-content">`,
        bodyHtml,
        `  </div>`,
        `</div>`,
        ''
      ].join('\n')
    );
  }

  return out.join('\n');
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (!data.content) return data;

  const postMap = new Map();
  hexo.locals.get('posts').forEach((post) => {
    if (!post.title || !post.path) return;
    postMap.set(String(post.title), `/${post.path}`);
    const base = String(post.source || '')
      .replace(/^_posts\//, '')
      .replace(/\.md$/i, '');
    if (base) postMap.set(base, `/${post.path}`);
  });

  let content = data.content;
  content = convertWikiImages(hexo, content);
  content = convertMarkdownImgRel(content);
  content = convertWikiLinks(content, postMap);
  content = convertCallouts(content);
  data.content = content;
  return data;
});

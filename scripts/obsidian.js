/**
 * Obsidian → Hexo 内容兼容：
 * 1) ![[img.png]] / ![[img.png|400]] 维基图片
 * 2) [[笔记名]] 维基链接（尽量转为站内文章链接）
 * 3) > [!note] Callout 提示框
 */

'use strict';

function encodePath(p) {
  return p
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function resolveImagePath(raw) {
  let p = String(raw || '').trim().replace(/\\/g, '/');
  if (!p) return p;
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:')) return p;

  // 去掉 Obsidian 可能带的 vault 前缀
  p = p.replace(/^source\//, '');

  if (p.startsWith('/')) return encodePath(p);

  // 纯文件名 → 统一图片库
  if (!p.includes('/')) {
    return encodePath(`/img/library/${p}`);
  }

  // img/xxx 或 _posts/xxx/yyy
  if (p.startsWith('img/') || p.startsWith('_posts/')) {
    return encodePath(`/${p}`);
  }

  return encodePath(`/img/library/${p}`);
}

function convertWikiImages(content) {
  return content.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, opt) => {
    const src = resolveImagePath(path);
    const alt = path.trim().split('/').pop();
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

function convertWikiLinks(content, postMap) {
  return content.replace(/(^|[^!])\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (full, prefix, target, alias) => {
    const name = target.trim();
    const text = (alias || name).trim();
    const hit = postMap.get(name) || postMap.get(name.replace(/\.md$/i, ''));
    if (hit) {
      return `${prefix}[${text}](${hit})`;
    }
    // 未找到对应文章时保留可读文本，避免坏链
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
  content = convertWikiImages(content);
  content = convertWikiLinks(content, postMap);
  content = convertCallouts(content);
  data.content = content;
  return data;
});

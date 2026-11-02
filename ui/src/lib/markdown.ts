/* ------------------------------------------------------------------ *
 *  Tiny markdown renderer (headings, lists, quotes, code, bold/italic/links, images)
 * ------------------------------------------------------------------ */
export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Image sources that can't run anything: web addresses, image data, and paths next to the page.
const safeSrc = (src: string) => /^(https?:|data:image\/|\.{0,2}\/|[\w-]+\/|[\w-]+\.\w+$)/i.test(src);

function inline(s: string): string {
  s = esc(s);
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_, c: string) => '\u0000' + (codes.push(c) - 1) + '\u0000');
  // Images are set aside like code, so the link pattern below doesn't see their [alt](src).
  const imgs: string[] = [];
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (all, alt: string, src: string) =>
    safeSrc(src)
      ? '\u0001' + (imgs.push(`<img class="md-img" src="${src}" alt="${alt}" loading="lazy">`) - 1) + '\u0001'
      : all,
  );
  s = s
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>');
  /* eslint-disable no-control-regex -- \u0000 and \u0001 mark where code spans and images go back in */
  return s
    .replace(/\u0001(\d+)\u0001/g, (_, n: string) => imgs[+n])
    .replace(/\u0000(\d+)\u0000/g, (_, n: string) => '<code>' + codes[+n] + '</code>');
  /* eslint-enable no-control-regex */
}

const isBlockStart = (l: string) => /^(```|#{1,4}\s|>|\s*[-*]\s+|\s*\d+[.)]\s+|(-{3,}|\*{3,})\s*$)/.test(l);

/** The HTML of each top-level block (paragraph, list, …), so a streaming reply only redraws the block that grew. */
export function renderBlocks(src: string): string[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const n = lines.length;
  const blocks: string[] = [];
  let html = '',
    i = 0,
    m: RegExpMatchArray | null;
  while (i < n) {
    if (html) blocks.push(html);
    html = '';
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < n && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      html += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>';
    } else if (!line.trim()) {
      i++;
    } else if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      html += `<h${Math.min(m[1].length + 1, 5)}>${inline(m[2])}</h${Math.min(m[1].length + 1, 5)}>`;
      i++;
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      html += '<hr>';
      i++;
    } else if (/^>/.test(line)) {
      const buf: string[] = [];
      while (i < n && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      html += '<blockquote>' + renderMarkdown(buf.join('\n')) + '</blockquote>';
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < n && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''));
      html += '<ul>' + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>';
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+/))) {
      const items: string[] = [],
        start = m[1];
      while (i < n && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      html += `<ol start="${start}">` + items.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>';
    } else {
      const buf = [lines[i++]];
      while (i < n && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
      html += '<p>' + buf.map(inline).join('<br>') + '</p>';
    }
  }
  if (html) blocks.push(html);
  return blocks;
}

export const renderMarkdown = (src: string) => renderBlocks(src).join('');

// While streaming, close dangling ** or ` so half-typed formatting doesn't flash raw symbols.
export function closeOpen(t: string): string {
  const outside = t.replace(/```[\s\S]*?(```|$)/g, '');
  if ((outside.match(/\*\*/g) || []).length % 2) t += '**';
  if ((outside.match(/`/g) || []).length % 2) t += '`';
  return t;
}

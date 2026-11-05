import type { ReactNode } from 'react';

// A tiny Markdown renderer for our own docs (headings, lists, paragraphs, **bold**, `code`).
// It builds React elements directly, so no HTML string is ever injected.

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(
      tok.startsWith('**') ? (
        <strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>
      ) : (
        <code key={`${key}-${i++}`}>{tok.slice(1, -1)}</code>
      ),
    );
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (list.length) {
      const k = `ul${blocks.length}`;
      blocks.push(
        <ul key={k}>
          {list.map((li, i) => (
            <li key={i}>{inline(li, `${k}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
    if (para.length) {
      const k = `p${blocks.length}`;
      blocks.push(<p key={k}>{inline(para.join(' '), k)}</p>);
      para = [];
    }
  };
  for (const raw of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const k = `h${blocks.length}`;
      const content = inline(h[2]!, k);
      blocks.push(
        h[1] === '#' ? (
          <h1 key={k}>{content}</h1>
        ) : h[1] === '##' ? (
          <h2 key={k}>{content}</h2>
        ) : (
          <h3 key={k}>{content}</h3>
        ),
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^\s*[-*]\s+/, ''));
    } else if (line.trim() === '') {
      flush();
    } else {
      if (list.length) flush();
      para.push(line.trim());
    }
  }
  flush();
  return <div className="md">{blocks}</div>;
}

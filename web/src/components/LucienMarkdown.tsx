import React, { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Lucien replies come back as light markdown. This is deliberately a small
// hand-rolled renderer rather than a markdown library: the reply surface is
// narrow (paragraphs, bullets, numbered steps, short headings, inline code and
// fenced blocks) and nothing here ever renders raw HTML, so borrower data in a
// reply can't smuggle markup into the panel.

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={j} className="lucien-md-code-inline">{p.slice(1, -1)}</code>;
    return <React.Fragment key={j}>{p}</React.Fragment>;
  });
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {/* clipboard blocked — the text is still selectable */});
  }, [code]);

  return (
    <div className="lucien-md-block-wrap">
      <div className="lucien-md-block-bar">
        <span className="lucien-md-block-lang">{lang || 'text'}</span>
        <button type="button" className="lucien-md-block-copy" onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}>
          {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="lucien-md-block"><code>{code}</code></pre>
    </div>
  );
}

export function LucienMarkdown({ text }: { text: string }) {
  const segments: React.ReactNode[] = [];
  const blocks = text.split(/(```[\s\S]*?```)/g);

  blocks.forEach((block, bi) => {
    if (block.startsWith('```')) {
      const lang = block.match(/^```(\w+)/)?.[1];
      const code = block.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
      segments.push(<CodeBlock key={`b${bi}`} code={code} lang={lang} />);
      return;
    }
    block.split('\n').forEach((line, li) => {
      const trimmed = line.trim();
      const isBullet   = /^[-*•]\s+/.test(trimmed);
      const isNumbered = /^\d+\.\s+/.test(trimmed);
      const isHeading  = /^#{1,3}\s+/.test(trimmed);
      const body = isBullet   ? trimmed.replace(/^[-*•]\s+/, '')
                 : isNumbered ? trimmed.replace(/^\d+\.\s+/, '')
                 : isHeading  ? trimmed.replace(/^#{1,3}\s+/, '')
                 : line;
      const inline = renderInline(body);
      const key = `${bi}-${li}`;
      if (isBullet)   { segments.push(<div key={key} className="lucien-md-li">{inline}</div>); return; }
      if (isNumbered) { segments.push(<div key={key} className="lucien-md-li lucien-md-li--num">{trimmed.match(/^(\d+)/)?.[1]}. {inline}</div>); return; }
      if (isHeading)  { segments.push(<div key={key} className="lucien-md-h">{inline}</div>); return; }
      if (trimmed === '') { segments.push(<div key={key} className="lucien-md-gap" aria-hidden="true" />); return; }
      segments.push(<div key={key} className="lucien-md-p">{inline}</div>);
    });
  });

  return <>{segments}</>;
}

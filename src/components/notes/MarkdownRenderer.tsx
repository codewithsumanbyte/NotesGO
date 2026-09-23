'use client';

import React from 'react';
import { CheckSquare, Square, Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onToggleTask?: (lineIndex: number) => void;
  className?: string;
}

export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
    .replace(/- \[[ xX]\] /g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

// Helper to render inline markdown (bold, italic, strikethrough, code, links)
function renderInline(text: string): React.ReactNode[] {
  // Regex to match inline tokens
  const tokenRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <strong key={index} className="font-bold italic text-vault-accent">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-vault-text">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} className="italic text-vault-accent">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={index} className="line-through text-muted-foreground/70">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="font-mono text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-vault-card border border-vault-border text-vault-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Links: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-vault-primary hover:text-vault-accent underline underline-offset-2 transition"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({ content, onToggleTask, className = '' }: MarkdownRendererProps) {
  const [copiedCodeIdx, setCopiedCodeIdx] = React.useState<number | null>(null);

  const copyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  if (!content || !content.trim()) {
    return (
      <div className={`text-muted-foreground/40 italic py-6 text-sm ${className}`}>
        Empty note. Start typing or use formatting buttons above...
      </div>
    );
  }

  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = '';
  let codeBlockIndex = 0;

  lines.forEach((line, index) => {
    // Code block start / end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBlockBuffer.join('\n');
        const currIdx = codeBlockIndex++;
        renderedElements.push(
          <div key={`codeblock-${index}`} className="my-3 rounded-xl overflow-hidden border border-vault-border bg-vault-card/70 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-vault-surface/90 border-b border-vault-border text-[11px] text-muted-foreground">
              <span className="uppercase font-semibold tracking-wider">{codeBlockLang || 'code'}</span>
              <button
                type="button"
                onClick={() => copyCode(codeText, currIdx)}
                className="flex items-center gap-1 hover:text-vault-primary transition"
              >
                {copiedCodeIdx === currIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-vault-accent" />
                    <span className="text-vault-accent">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-vault-text overflow-x-auto leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockBuffer = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockBuffer = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      renderedElements.push(<hr key={index} className="my-4 border-vault-border" />);
      return;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={index} className="font-heading font-bold text-xl sm:text-2xl text-vault-text mt-4 mb-2 pb-1 border-b border-vault-border/50">
          {renderInline(line.slice(2))}
        </h1>
      );
      return;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={index} className="font-heading font-semibold text-lg sm:text-xl text-vault-text mt-3.5 mb-1.5">
          {renderInline(line.slice(3))}
        </h2>
      );
      return;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={index} className="font-heading font-semibold text-base text-vault-accent mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      renderedElements.push(
        <div key={index} className="border-l-4 border-vault-primary bg-vault-card/40 pl-3.5 py-1.5 my-2 rounded-r-xl italic text-muted-foreground text-sm">
          {renderInline(line.replace(/^>\s?/, ''))}
        </div>
      );
      return;
    }

    // Checklist Item: - [ ] or - [x]
    const checklistMatch = line.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (checklistMatch) {
      const isChecked = checklistMatch[1].toLowerCase() === 'x';
      const taskText = checklistMatch[2];
      renderedElements.push(
        <div
          key={index}
          onClick={() => onToggleTask?.(index)}
          className={`flex items-start gap-2.5 my-1 text-sm select-none ${onToggleTask ? 'cursor-pointer' : ''}`}
        >
          <button
            type="button"
            className="mt-0.5 text-vault-primary hover:text-vault-accent transition shrink-0"
          >
            {isChecked ? (
              <CheckSquare className="w-4 h-4 text-vault-accent fill-vault-accent/20" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground/60 hover:text-vault-primary" />
            )}
          </button>
          <span className={`${isChecked ? 'line-through text-muted-foreground/60' : 'text-vault-text'}`}>
            {renderInline(taskText)}
          </span>
        </div>
      );
      return;
    }

    // Bullet List: - item or * item
    if (/^[-*]\s+/.test(line)) {
      renderedElements.push(
        <div key={index} className="flex items-start gap-2 my-1 text-sm text-vault-text/90 pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-vault-primary mt-2 shrink-0" />
          <span>{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
        </div>
      );
      return;
    }

    // Numbered List: 1. item
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      renderedElements.push(
        <div key={index} className="flex items-start gap-2 my-1 text-sm text-vault-text/90 pl-1">
          <span className="font-mono text-xs text-vault-primary font-bold min-w-[18px]">
            {numberedMatch[1]}.
          </span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    // Blank line
    if (!line.trim()) {
      renderedElements.push(<div key={index} className="h-3" />);
      return;
    }

    // Standard paragraph
    renderedElements.push(
      <p key={index} className="my-1 text-sm text-vault-text/90 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  return (
    <div className={`prose-neutral max-w-none text-vault-text ${className}`}>
      {renderedElements}
    </div>
  );
}

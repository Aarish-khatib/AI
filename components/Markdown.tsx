"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="code-copy"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      aria-label="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {label}
            </a>
          ),
          code: ({ className, children: codeChildren, ...props }) => {
            const value = String(codeChildren).replace(/\n$/, "");
            const block = Boolean(className) || value.includes("\n");
            if (!block) return <code {...props}>{codeChildren}</code>;
            const language = className?.replace("language-", "") || "code";
            return (
              <span className="code-shell">
                <span className="code-toolbar">
                  <span>{language}</span>
                  <CopyButton value={value} />
                </span>
                <code className={className} {...props}>
                  {value}
                </code>
              </span>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

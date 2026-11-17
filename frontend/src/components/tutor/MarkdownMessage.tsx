import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Check, Copy, Terminal } from 'lucide-react'

interface MarkdownMessageProps {
  content: string
  className?: string
}

const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-[13px] leading-relaxed font-mono text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  return (
    <div className={`ai-markdown text-[14px] sm:text-[15px] text-slate-700 leading-[1.7] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-900 mt-5 mb-3 pb-2 border-b border-slate-200 tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-900 mt-5 mb-2.5 pb-1.5 border-b border-slate-100 tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] sm:text-base font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2 first:mt-0">
              <span className="w-1 h-4 rounded-full bg-indigo-500 shrink-0 inline-block" />
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-indigo-950 mt-4 mb-1.5 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0 text-slate-700">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children, className: ulClass }) => {
            const isTaskList = ulClass?.includes('contains-task-list')
            return (
              <ul
                className={
                  isTaskList
                    ? 'my-3 space-y-2 pl-1 list-none'
                    : 'my-3 space-y-1.5 pl-5 list-disc marker:text-indigo-500'
                }
              >
                {children}
              </ul>
            )
          },
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 pl-5 list-decimal marker:text-indigo-600 marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children, className: liClass }) => {
            const isTaskItem = liClass?.includes('task-list-item')
            return (
              <li
                className={
                  isTaskItem
                    ? 'flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 text-slate-700'
                    : 'leading-relaxed text-slate-700 pl-0.5'
                }
              >
                {children}
              </li>
            )
          },
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  defaultChecked={checked}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer shrink-0"
                />
              )
            }
            return null
          },
          hr: () => <hr className="my-5 border-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />,
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 pr-4 py-3 border-l-4 border-indigo-400 bg-indigo-50/50 rounded-r-xl text-slate-700">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-50/60 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold text-slate-900">{children}</th>,
          td: ({ children }) => <td className="px-3.5 py-2.5 text-slate-700">{children}</td>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-medium underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 hover:decoration-indigo-600 transition-colors"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClassName, children }) => {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const rawCode = String(children).replace(/\n$/, '')
            const isBlock = Boolean(match) || rawCode.includes('\n')

            if (isBlock) {
              return <CodeBlock language={match?.[1]} code={rawCode} />
            }

            return (
              <code className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-indigo-700 border border-slate-200/80 font-mono text-[0.85em]">
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

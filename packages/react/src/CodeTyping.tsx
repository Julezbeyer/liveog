import React from 'react'
import { resolveEasing, segmentProgress, type Easing } from '@liveog/core'
import { useLiveOGTime } from './index'

export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'json'
  | 'bash'
  | 'html'
  | 'css'
  | 'text'
  | (string & {})

export type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'boolean'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'property'
  | 'variable'
  | 'plain'

export interface Token {
  type: TokenType
  text: string
}

export const defaultCodeTheme: Record<TokenType, string> = {
  keyword: '#ff7b72',
  string: '#a5d6ff',
  number: '#79c0ff',
  comment: '#8b949e',
  boolean: '#ff7b72',
  function: '#d2a8ff',
  operator: '#79c0ff',
  punctuation: '#c9d1d9',
  property: '#7ee787',
  variable: '#ffa657',
  plain: '#e6edf3',
}

interface TokenRule {
  type: TokenType
  pattern: RegExp
}

function getLanguageRules(lang?: string): TokenRule[] {
  const normalized = (lang ?? 'text').toLowerCase().trim()

  switch (normalized) {
    case 'typescript':
    case 'javascript':
    case 'ts':
    case 'js':
    case 'tsx':
    case 'jsx':
      return [
        // Comments
        { type: 'comment', pattern: /\/\/[^\n]*/y },
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//y },
        // Strings
        { type: 'string', pattern: /"(?:\\.|[^"\\])*"/y },
        { type: 'string', pattern: /'(?:\\.|[^'\\])*'/y },
        { type: 'string', pattern: /`(?:\\.|[^`\\])*`/y },
        // Numbers
        { type: 'number', pattern: /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y },
        // Keywords
        {
          type: 'keyword',
          pattern: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|default|break|continue|try|catch|finally|throw|new|class|extends|export|import|from|as|async|await|yield|typeof|instanceof|in|of|void|delete|interface|type|enum|namespace|public|private|protected|readonly|static|abstract|implements|declare)\b/y,
        },
        // Booleans & null/undefined
        { type: 'boolean', pattern: /\b(?:true|false|null|undefined)\b/y },
        // Function calls
        { type: 'function', pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/y },
        // Operators & Punctuation
        { type: 'operator', pattern: /=>|===|!==|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*/%=<>!&|^~?:]/y },
        { type: 'punctuation', pattern: /[{}()[\].,;]/y },
        // Identifiers
        { type: 'variable', pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'python':
    case 'py':
      return [
        // Comments
        { type: 'comment', pattern: /#[^\n]*/y },
        // Triple-quoted strings
        { type: 'string', pattern: /"""(?:\\.|[\s\S])*?"""|'''(?:\\.|[\s\S])*?'''/y },
        // Single/double quoted strings
        { type: 'string', pattern: /[fFrRuUbB]?"(?:\\.|[^"\\])*"|[fFrRuUbB]?'(?:\\.|[^'\\])*'/y },
        // Numbers
        { type: 'number', pattern: /\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/y },
        // Keywords
        {
          type: 'keyword',
          pattern: /\b(?:def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|lambda|yield|pass|break|continue|and|or|not|is|in|async|await|global|nonlocal|assert|del)\b/y,
        },
        // Booleans & None
        { type: 'boolean', pattern: /\b(?:True|False|None)\b/y },
        // Function calls
        { type: 'function', pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/y },
        // Operators & Punctuation
        { type: 'operator', pattern: /==|!=|<=|>=|\*\*|\/\/|[+\-*/%=<>!&|^~]/y },
        { type: 'punctuation', pattern: /[{}()[\].,:;]/y },
        // Identifiers
        { type: 'variable', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'json':
      return [
        // Property keys
        { type: 'property', pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
        // Strings
        { type: 'string', pattern: /"(?:\\.|[^"\\])*"/y },
        // Numbers
        { type: 'number', pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
        // Booleans & Null
        { type: 'boolean', pattern: /\b(?:true|false|null)\b/y },
        // Punctuation
        { type: 'punctuation', pattern: /[{}\[\],:]/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'bash':
    case 'sh':
    case 'shell':
    case 'zsh':
      return [
        // Comments
        { type: 'comment', pattern: /#[^\n]*/y },
        // Strings
        { type: 'string', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
        // Variables
        { type: 'variable', pattern: /\$(?:\{[a-zA-Z0-9_]+\}|[a-zA-Z0-9_]+|[0-9?*@#$!])/y },
        // Keywords
        {
          type: 'keyword',
          pattern: /\b(?:if|then|else|elif|fi|case|esac|for|select|while|until|do|done|in|function|time|echo|export|set|unset|exit|return|readonly|local)\b/y,
        },
        // Flags
        { type: 'operator', pattern: /--?[a-zA-Z0-9_-]+/y },
        // Operators & Punctuation
        { type: 'operator', pattern: /&&|\|\||>>|>|<|\||;|&/y },
        { type: 'punctuation', pattern: /[{}()[\].,:;]/y },
        // Numbers
        { type: 'number', pattern: /\b\d+\b/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'html':
    case 'xml':
      return [
        // Comments
        { type: 'comment', pattern: /<!--[\s\S]*?-->/y },
        // Tags
        { type: 'keyword', pattern: /<\/?[a-zA-Z0-9_-]+/y },
        { type: 'keyword', pattern: /\/>|>/y },
        // Attribute names
        { type: 'property', pattern: /[a-zA-Z0-9_-]+(?=\s*=)/y },
        // Strings
        { type: 'string', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
        // Punctuation
        { type: 'punctuation', pattern: /=/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'css':
      return [
        // Comments
        { type: 'comment', pattern: /\/\*[\s\S]*?\*\//y },
        // At-rules
        { type: 'keyword', pattern: /@[a-zA-Z-]+/y },
        // Property names
        { type: 'property', pattern: /[a-zA-Z-]+(?=\s*:)/y },
        // Numbers & Units
        { type: 'number', pattern: /\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg|fr)?\b/y },
        // Strings
        { type: 'string', pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y },
        // Keywords
        { type: 'keyword', pattern: /!important\b/y },
        // Punctuation
        { type: 'punctuation', pattern: /[{}:;,]/y },
        // Whitespace
        { type: 'plain', pattern: /\s+/y },
      ]

    case 'text':
    case 'txt':
    case 'plain':
    default:
      return [
        { type: 'plain', pattern: /\s+/y },
        { type: 'plain', pattern: /\S+/y },
      ]
  }
}

/**
 * Tokenizes the input code into syntax tokens without external dependencies.
 * Guarantees: tokens.map(t => t.text).join('') === code exactly.
 */
export function tokenizeCode(code: string, language?: string): Token[] {
  if (!code) return []
  const rules = getLanguageRules(language)
  const tokens: Token[] = []
  let index = 0

  while (index < code.length) {
    let matched = false

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (!rule) continue
      rule.pattern.lastIndex = index
      const match = rule.pattern.exec(code)
      if (match && rule.pattern.lastIndex > index) {
        const text = code.slice(index, rule.pattern.lastIndex)
        tokens.push({ type: rule.type, text })
        index = rule.pattern.lastIndex
        matched = true
        break
      }
    }

    if (!matched) {
      // Fallback: advance 1 character as plain text
      const char = code[index] ?? ''
      const lastToken = tokens[tokens.length - 1]
      if (lastToken && lastToken.type === 'plain') {
        lastToken.text += char
      } else {
        tokens.push({ type: 'plain', text: char })
      }
      index++
    }
  }

  return tokens
}

export interface CodeTypingProps {
  /** The code or text to progressively type out. */
  code?: string
  /** Alias for code, commonly used when treating as a Typewriter. */
  text?: string
  /** Programming language for syntax highlighting. Default 'text'. */
  language?: CodeLanguage
  /** Delay in milliseconds before typing begins. Default 0. */
  delay?: number
  /** Duration of typing in milliseconds. Default 2000. */
  duration?: number
  /** Easing curve for typing progression. Default 'linear'. */
  easing?: Easing
  /** Whether to render the cursor. Default true. */
  showCursor?: boolean
  /** Alias/override for showCursor or custom React node. */
  cursor?: boolean | React.ReactNode
  /** Character used for the cursor. Default '▌'. */
  cursorChar?: string
  /** Blink interval in milliseconds. Set to 0 to disable blinking. Default 500. */
  cursorBlinkRate?: number
  /** Whether to hide cursor when typing reaches 100% progress. Default false. */
  hideCursorOnComplete?: boolean
  /** Custom syntax highlight colors keyed by token type. */
  theme?: Partial<Record<TokenType, string>>
  /** Wrapping HTML element tag name. Defaults to 'span' if text is passed, otherwise 'pre'. */
  as?: 'pre' | 'code' | 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | string
  /** Optional class name. */
  className?: string
  /** Optional inline styles. */
  style?: React.CSSProperties
}

export function CodeTyping({
  code,
  text,
  language = 'text',
  delay = 0,
  duration = 2000,
  easing = 'linear',
  showCursor = true,
  cursor,
  cursorChar = '▌',
  cursorBlinkRate = 500,
  hideCursorOnComplete = false,
  theme,
  as,
  className,
  style,
}: CodeTypingProps) {
  const t = useLiveOGTime()
  const rawContent = code ?? text ?? ''
  const totalChars = rawContent.length

  // Calculate deterministic progress strictly from LiveOG time
  const rawProgress = segmentProgress(t, delay, duration)
  const p = resolveEasing(easing)(rawProgress)

  // Character budget: B = Math.round(p * totalChars)
  const budget = Math.max(0, Math.min(totalChars, Math.round(p * totalChars)))

  // Deterministic tokenization
  const tokens = React.useMemo(() => tokenizeCode(rawContent, language), [rawContent, language])

  // Deterministic token slicing: slice tokens to match character budget
  const renderedTokens: Array<{ type: TokenType; text: string; key: number }> = []
  let remaining = budget

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token || remaining <= 0) break
    if (token.text.length <= remaining) {
      renderedTokens.push({ type: token.type, text: token.text, key: i })
      remaining -= token.text.length
    } else {
      renderedTokens.push({
        type: token.type,
        text: token.text.slice(0, remaining),
        key: i,
      })
      remaining = 0
      break
    }
  }

  // Deterministic cursor visibility derived purely mathematically from timestamp t
  const isCursorEnabled = cursor !== false && showCursor !== false
  const isComplete = p >= 1
  const shouldRenderCursor = isCursorEnabled && !(hideCursorOnComplete && isComplete)
  const isCursorVisible = cursorBlinkRate > 0 ? Math.floor(t / cursorBlinkRate) % 2 === 0 : true

  const getTokenColor = (type: TokenType): string => {
    return theme?.[type] ?? defaultCodeTheme[type]
  }

  const Tag = (as ?? (text !== undefined && code === undefined ? 'span' : 'pre')) as React.ElementType

  return (
    <Tag
      data-testid="code-typing"
      className={className}
      style={{
        margin: 0,
        fontFamily: Tag === 'pre' || Tag === 'code' ? 'monospace' : undefined,
        whiteSpace: Tag === 'pre' ? 'pre' : 'pre-wrap',
        ...style,
      }}
    >
      <span data-testid="code-typing-content">
        {renderedTokens.map((tok) => (
          <span
            key={tok.key}
            className={`liveog-token liveog-token-${tok.type}`}
            style={{ color: getTokenColor(tok.type) }}
          >
            {tok.text}
          </span>
        ))}
      </span>
      {shouldRenderCursor && (
        <span
          data-testid="liveog-cursor"
          data-visible={isCursorVisible ? 'true' : 'false'}
          className="liveog-cursor"
          style={{
            display: 'inline-block',
            opacity: isCursorVisible ? 1 : 0,
            marginLeft: '2px',
            verticalAlign: 'baseline',
          }}
          aria-hidden="true"
        >
          {typeof cursor === 'object' && cursor !== null ? cursor : cursorChar}
        </span>
      )}
    </Tag>
  )
}

/**
 * Typewriter alias for CodeTyping for convenient developer ergonomics.
 */
export const Typewriter = CodeTyping
export type TypewriterProps = CodeTypingProps

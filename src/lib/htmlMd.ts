import { parseMd, type Block, type Inline } from './mdlite.ts'

/**
 * The journal editor shows formatted text as you type (no `**` or `#` on screen) but stores the same Markdown-lite string as before,
 * so old entries, drafts and sync keep working. This is the bridge: Markdown-lite → a small node tree (rendered into the editor),
 * and the editor's DOM → Markdown-lite. Pure and DOM-free (any object shaped like a DOM node works), tested in scripts/test-journal.mjs.
 */
export interface DomLike { nodeType: number; nodeName: string; nodeValue: string | null; childNodes: ArrayLike<DomLike> }
/** The tree the editor is built from; shaped like DOM nodes so the same serializer reads it back. */
export interface TNode extends DomLike { childNodes: TNode[] }
const text = (v: string): TNode => ({ nodeType: 3, nodeName: '#text', nodeValue: v, childNodes: [] })
const el = (tag: string, kids: TNode[] = []): TNode => ({ nodeType: 1, nodeName: tag, nodeValue: null, childNodes: kids })

function inlineNodes(c: Inline[]): TNode[] {
  return c.flatMap<TNode>(n => {
    if (n.t === 'text') return n.v.split('\n').flatMap((part, i) => (i ? [el('BR'), text(part)] : [text(part)])).filter(x => x.nodeName !== '#text' || x.nodeValue !== '')
    return [el(n.t === 'b' ? 'B' : n.t === 'i' ? 'I' : 'S', inlineNodes(n.c))]
  })
}
function blockNode(b: Block): TNode {
  if (b.t === 'h') return el('H3', inlineNodes(b.c))
  if (b.t === 'quote') return el('BLOCKQUOTE', inlineNodes(b.c))
  if (b.t === 'hr') return el('HR')
  if ('items' in b) return el(b.t === 'ul' ? 'UL' : 'OL', b.items.map(it => el('LI', inlineNodes(it))))
  return el('P', inlineNodes(b.c))
}
export const mdToTree = (md: string): TNode[] => parseMd(md).map(blockNode)

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'HR', 'PRE'])
const kids = (n: DomLike) => Array.from(n.childNodes)
const isEl = (n: DomLike) => n.nodeType === 1
const tag = (n: DomLike) => n.nodeName.toUpperCase()
const hasBlock = (n: DomLike) => kids(n).some(k => isEl(k) && BLOCKS.has(tag(k)))
const clean = (s: string) => s.replace(/ /g, ' ').replace(/[​‌‍﻿]/g, '')

/** Inline content of a node as Markdown-lite (bold/italic/strike and line breaks). Spaces at the edges of a styled run stay outside the markers. */
function inline(n: DomLike): string {
  if (n.nodeType === 3) return clean(n.nodeValue ?? '')
  if (!isEl(n)) return ''
  const t = tag(n)
  if (t === 'BR') return '\n'
  const inner = kids(n).map(inline).join('')
  const mark = t === 'B' || t === 'STRONG' ? '**' : t === 'I' || t === 'EM' ? '*' : t === 'S' || t === 'STRIKE' || t === 'DEL' ? '~~' : ''
  if (!mark || !inner.trim() || inner.includes('\n')) return inner
  const core = inner.trim(), lead = inner.slice(0, inner.indexOf(core)), trail = inner.slice(inner.indexOf(core) + core.length)
  return `${lead}${mark}${core}${mark}${trail}`
}

interface Out { lines: string[]; list: boolean }   // one entry per Markdown block; list items are kept together
export function domToMd(root: DomLike): string {
  const out: Out[] = []
  const push = (md: string, list = false) => { if (md.trim()) out.push({ lines: [md.replace(/^[ \t]+|\s+$/g, '')], list }) }
  let run: DomLike[] = []
  const flush = () => { const md = run.map(inline).join('').replace(/^\n+|\n+$/g, ''); if (md.trim()) push(md); run = [] }
  const walk = (n: DomLike) => {
    if (!isEl(n)) { run.push(n); return }
    const t = tag(n)
    if (!BLOCKS.has(t)) { run.push(n); return }
    flush()
    if (t === 'UL' || t === 'OL') {
      const items = kids(n).filter(k => isEl(k) && tag(k) === 'LI')
      items.forEach((li, i) => {
        const md = kids(li).filter(k => !(isEl(k) && (tag(k) === 'UL' || tag(k) === 'OL'))).map(inline).join('').replace(/^\n+|\n+$/g, '').replace(/\n/g, ' ')
        if (md.trim()) out.push({ lines: [`${t === 'UL' ? '-' : `${i + 1}.`} ${md.trim()}`], list: true })
      })
    } else if (t === 'HR') push('---')
    else if (/^H[1-6]$/.test(t)) push(`# ${kids(n).map(inline).join('').replace(/\n/g, ' ').trim()}`.replace(/^# $/, ''))
    else if (t === 'BLOCKQUOTE') {
      if (hasBlock(n)) { const sub = domToMd(n); if (sub.trim()) push(sub.split('\n').filter(l => l.trim()).map(l => `> ${l}`).join('\n')) }
      else push(`> ${kids(n).map(inline).join('').replace(/\n/g, ' ').trim()}`.replace(/^> $/, ''))
    } else if (hasBlock(n)) kids(n).forEach(walk)                 // a div that wraps blocks
    else push(kids(n).map(inline).join('').replace(/^\n+|\n+$/g, ''))  // p / div / pre: one paragraph
    flush()
  }
  kids(root).forEach(walk); flush()
  // paragraphs are separated by a blank line, list items by a single newline
  return out.map((b, i) => (i === 0 ? '' : out[i - 1].list && b.list ? '\n' : '\n\n') + b.lines.join('\n')).join('')
}

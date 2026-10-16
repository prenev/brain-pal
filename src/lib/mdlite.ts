/** A tiny, safe Markdown subset for the journal (bold, italic, strike, headings, lists, quotes). Pure: parse to data, render as React text, never as HTML. Tested in scripts/test-journal.mjs. */
export type Inline = { t: 'text'; v: string } | { t: 'b' | 'i' | 's'; c: Inline[] }
export type Block =
  | { t: 'p'; c: Inline[] } | { t: 'h'; c: Inline[] } | { t: 'quote'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] } | { t: 'hr' }

export type FormatKind = 'bold' | 'italic' | 'strike' | 'heading' | 'bullet' | 'number' | 'quote'
const WRAP: Partial<Record<FormatKind, string>> = { bold: '**', italic: '*', strike: '~~' }
const PREFIX: Partial<Record<FormatKind, (i: number) => string>> = { heading: () => '# ', bullet: () => '- ', number: i => `${i + 1}. `, quote: () => '> ' }
const LINE_RE: Record<string, RegExp> = { heading: /^#{1,3} /, bullet: /^[-*] /, number: /^\d+\. /, quote: /^> / }

export interface Edit { text: string; start: number; end: number }

/** Apply a toolbar button to a text selection. Wrapping toggles (selecting **text** and pressing bold removes it); line formats apply to every selected line and toggle too. */
export function applyFormat(text: string, start: number, end: number, kind: FormatKind): Edit {
  const w = WRAP[kind]
  if (w) {
    const sel = text.slice(start, end)
    const before = text.slice(Math.max(0, start - w.length), start), after = text.slice(end, end + w.length)
    if (before === w && after === w) return { text: text.slice(0, start - w.length) + sel + text.slice(end + w.length), start: start - w.length, end: end - w.length }
    if (sel.length > w.length * 2 && sel.startsWith(w) && sel.endsWith(w)) { const inner = sel.slice(w.length, sel.length - w.length); return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length } }
    return { text: text.slice(0, start) + w + sel + w + text.slice(end), start: start + w.length, end: end + w.length }
  }
  const from = text.lastIndexOf('\n', start - 1) + 1
  const toRaw = text.indexOf('\n', end); const to = toRaw === -1 ? text.length : toRaw
  const lines = text.slice(from, to).split('\n')
  const re = LINE_RE[kind], pre = PREFIX[kind]!
  const allOn = lines.every(l => re.test(l))
  const out = lines.map((l, i) => (allOn ? l.replace(re, '') : pre(i) + l.replace(/^(#{1,3} |[-*] |\d+\. |> )/, ''))).join('\n')
  const delta = out.length - (to - from)
  return { text: text.slice(0, from) + out + text.slice(to), start: Math.max(from, start + (allOn ? -pre(0).length : pre(0).length)), end: end + delta }
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = []; let i = 0, buf = ''
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = '' } }
  while (i < s.length) {
    const tries: [string, 'b' | 'i' | 's'][] = [['**', 'b'], ['~~', 's'], ['*', 'i']]
    let hit = false
    for (const [m, t] of tries) {
      if (!s.startsWith(m, i)) continue
      const close = s.indexOf(m, i + m.length)
      if (close > i + m.length && !/^\s|\s$/.test(s.slice(i + m.length, close))) { flush(); out.push({ t, c: parseInline(s.slice(i + m.length, close)) }); i = close + m.length; hit = true; break }
    }
    if (!hit) buf += s[i++]
  }
  flush(); return out
}

export function parseMd(src: string): Block[] {
  const blocks: Block[] = [], lines = src.replace(/\r\n/g, '\n').split('\n')
  let para: string[] = [], list: { t: 'ul' | 'ol'; items: Inline[][] } | null = null
  const endPara = () => { if (para.length) { blocks.push({ t: 'p', c: parseInline(para.join('\n')) }); para = [] } }
  const endList = () => { if (list) { blocks.push(list); list = null } }
  for (const line of lines) {
    let m: RegExpExecArray | null
    if (!line.trim()) { endPara(); endList() }
    else if ((m = /^#{1,3} (.*)$/.exec(line))) { endPara(); endList(); blocks.push({ t: 'h', c: parseInline(m[1]) }) }
    else if ((m = /^> ?(.*)$/.exec(line))) { endPara(); endList(); blocks.push({ t: 'quote', c: parseInline(m[1]) }) }
    else if (/^(-{3,}|\*{3,})$/.test(line.trim())) { endPara(); endList(); blocks.push({ t: 'hr' }) }
    else if ((m = /^[-*] (.*)$/.exec(line))) { endPara(); if (list?.t !== 'ul') { endList(); list = { t: 'ul', items: [] } } list.items.push(parseInline(m[1])) }
    else if ((m = /^\d+\. (.*)$/.exec(line))) { endPara(); if (list?.t !== 'ol') { endList(); list = { t: 'ol', items: [] } } list.items.push(parseInline(m[1])) }
    else { endList(); para.push(line) }
  }
  endPara(); endList(); return blocks
}

/** Plain text for list previews and word counts: the markers go, the words stay. */
export function stripMd(src: string): string {
  return src.replace(/^#{1,3} /gm, '').replace(/^> ?/gm, '').replace(/^[-*] /gm, '').replace(/^\d+\. /gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
}

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { domToMd, mdToTree, type TNode } from '../lib/htmlMd.ts'
import type { FormatKind } from '../lib/mdlite.ts'

export interface RichHandle { focus(): void; format(kind: FormatKind): void }

/** A TNode becomes a real element; text goes in as text, so nothing typed can ever become markup. */
function build(n: TNode): Node {
  if (n.nodeType === 3) return document.createTextNode(n.nodeValue ?? '')
  const e = document.createElement(n.nodeName.toLowerCase())
  n.childNodes.forEach(c => e.appendChild(build(c)))
  return e
}
const caretToEnd = (root: HTMLElement) => { const s = window.getSelection(); if (!s) return; const r = document.createRange(); r.selectNodeContents(root); r.collapse(false); s.removeAllRanges(); s.addRange(r) }
const blockOf = (root: HTMLElement, node: Node | null): HTMLElement | null => { let n: Node | null = node; while (n && n !== root) { if (n.nodeType === 1 && /^(P|DIV|H[1-6]|BLOCKQUOTE|LI)$/.test((n as Element).tagName)) return n as HTMLElement; n = n.parentNode } return null }
const exec = (cmd: string, arg?: string) => { try { document.execCommand(cmd, false, arg) } catch { /* unsupported: ignore */ } }

/** Inline Markdown typed as you go: **bold**, *italic*, ~~strike~~ become formatted text as soon as the closing marker is typed. */
const INLINE: { re: RegExp; cmd: string }[] = [
  { re: /\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, cmd: 'bold' }, { re: /~~([^~\s](?:[^~]*[^~\s])?)~~$/, cmd: 'strikeThrough' }, { re: /(?:^|[^*])\*([^*\s](?:[^*]*[^*\s])?)\*$/, cmd: 'italic' },
]

/**
 * The page you write on: formatted as you type, never with Markdown symbols on screen. It is stored as the same Markdown-lite string as before
 * (`value`), so old entries, drafts and sync are unchanged. Pasting inserts plain text only.
 */
const RichBody = forwardRef<RichHandle, { value: string; onChange: (md: string) => void; max: number; placeholder: string; label: string; autoFocus?: boolean }>(
  function RichBody({ value, onChange, max, placeholder, label, autoFocus }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const last = useRef(value)

    const paint = (md: string) => { const r = root.current!; r.replaceChildren(...mdToTree(md).map(build)); if (!md.trim()) r.replaceChildren() }
    useLayoutEffect(() => { exec('defaultParagraphSeparator', 'p'); paint(value); last.current = value; if (autoFocus) { root.current!.focus({ preventScroll: true }); caretToEnd(root.current!) } }, [])   // eslint-disable-line react-hooks/exhaustive-deps
    // Changed from outside (a topic chip, a voice transcript, a restored draft): show it and put the cursor after it.
    useLayoutEffect(() => { if (value !== last.current) { paint(value); last.current = value; if (document.activeElement === root.current) caretToEnd(root.current!) } }, [value])

    const emit = () => {
      const r = root.current!, md = domToMd(r)
      if (/^(<(p|div)>)?<br>(<\/(p|div)>)?$/i.test(r.innerHTML)) r.replaceChildren()    // a lone <br> would hide the placeholder (an empty heading or list item must stay)
      last.current = md; onChange(md)
    }

    function shortcuts(e: InputEvent): boolean | void {
      const sel = window.getSelection(); if (!sel || !sel.rangeCount || !sel.isCollapsed) return
      const r = root.current!, node = sel.anchorNode, block = blockOf(r, node)
      // "- ", "* ", "1. ", "# ", "> " at the start of a line turn into a list, heading or quote
      if (e.inputType === 'insertText' && e.data === ' ' && node && node.nodeType === 3 && block?.tagName !== 'LI') {
        const t = ((block ?? node).textContent ?? '').replace(/\u00a0/g, ' ')      // (a first line typed straight into the editor has no block around it yet)
        const cmd = t === '- ' || t === '* ' ? () => exec('insertUnorderedList') : t === '1. ' ? () => exec('insertOrderedList') : t === '# ' ? () => exec('formatBlock', '<h3>') : t === '> ' ? () => exec('formatBlock', '<blockquote>') : null
        if (cmd) {
          cmd()                                                                      // make the block first (an empty line can't be turned into one) …
          const s2 = window.getSelection(), n2 = s2?.anchorNode
          if (s2 && n2 && n2.nodeType === 3) {
            const tx = n2 as Text; tx.deleteData(0, Math.min(t.length, tx.length))
            const blk = blockOf(r, tx), r2 = document.createRange()
            if (blk && !blk.textContent) { blk.replaceChildren(document.createElement('br')); r2.setStart(blk, 0) } else r2.setStart(tx, 0)   // an empty block needs a <br> to hold the cursor
            r2.collapse(true); s2.removeAllRanges(); s2.addRange(r2)
          }   // … then drop the marker
          return true
        }
      }
      // closing marker typed → format the run in between
      if (e.inputType === 'insertText' && node && node.nodeType === 3) {
        const tn = node as Text, before = tn.data.slice(0, sel.anchorOffset)
        for (const { re, cmd } of INLINE) {
          const m = re.exec(before); if (!m) continue
          const inner = m[1], markLen = cmd === 'italic' ? 1 : 2, from = before.length - inner.length - markLen * 2
          if (from < 0) continue
          const rng = document.createRange(); rng.setStart(tn, from); rng.setEnd(tn, before.length); sel.removeAllRanges(); sel.addRange(rng)
          exec('insertText', inner)                                               // the markers go, the words stay
          const s2 = window.getSelection()!, cur = s2.getRangeAt(0), r2 = document.createRange()
          r2.setStart(cur.startContainer, Math.max(0, cur.startOffset - inner.length)); r2.setEnd(cur.startContainer, cur.startOffset); s2.removeAllRanges(); s2.addRange(r2)
          exec(cmd); s2.collapseToEnd(); exec(cmd)                                // style the run, then switch the style off for what comes next
          return true
        }
      }
    }

    useImperativeHandle(ref, () => ({
      focus: () => { const r = root.current; if (r) { r.focus(); caretToEnd(r) } },
      format(kind) {
        const r = root.current!; r.focus()
        const sel = window.getSelection(), block = sel && sel.rangeCount ? blockOf(r, sel.anchorNode) : null
        if (kind === 'bold') exec('bold'); else if (kind === 'italic') exec('italic'); else if (kind === 'strike') exec('strikeThrough')
        else if (kind === 'bullet') exec('insertUnorderedList'); else if (kind === 'number') exec('insertOrderedList')
        else if (kind === 'heading') exec('formatBlock', block?.tagName === 'H3' ? '<p>' : '<h3>')
        else if (kind === 'quote') exec('formatBlock', block?.tagName === 'BLOCKQUOTE' ? '<p>' : '<blockquote>')
        emit()
      },
    }))

    return (
      <div ref={root} className="notes-body rich" role="textbox" aria-multiline="true" aria-label={label} contentEditable suppressContentEditableWarning spellCheck data-placeholder={placeholder}
        autoCapitalize="sentences" autoCorrect="on" enterKeyHint="enter" tabIndex={0}
        onBeforeInput={e => { const ne = e.nativeEvent as InputEvent; if (/^insert/.test(ne.inputType) && domToMd(root.current!).length >= max) e.preventDefault() }}
        onInput={e => { const ne = e.nativeEvent as InputEvent; if (/^delete/.test(ne.inputType) && !root.current!.textContent) root.current!.replaceChildren(); else shortcuts(ne); emit() }}   /* deleting everything leaves a clean page, not an empty list or heading */
        onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text/plain').slice(0, Math.max(0, max - domToMd(root.current!).length)); if (t) exec('insertText', t) }} />
    )
  })
export default RichBody

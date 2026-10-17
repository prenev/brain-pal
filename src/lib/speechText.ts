/** Live captions: turn the stream of recogniser results into one running transcript. Pure, tested in scripts/test-speech.mjs. */
export interface SpeechPart { text: string; isFinal: boolean }

export interface Captions { /** settled text */ final: string; /** the words still being worked out */ interim: string }
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Join result segments in order: finished ones become the transcript, the unfinished tail is shown dimmed. */
export function mergeParts(parts: SpeechPart[]): Captions {
  const done = parts.filter(p => p.isFinal).map(p => squash(p.text)).filter(Boolean)
  const tail = parts.filter(p => !p.isFinal).map(p => squash(p.text)).filter(Boolean)
  return { final: done.join(' '), interim: tail.join(' ') }
}

/** What to keep when recording stops: everything heard, tidied into sentences-ish text (first letter up, one space, no stray space before punctuation). */
export function finishTranscript(c: Captions): string {
  const all = squash(`${c.final} ${c.interim}`).replace(/\s+([,.!?;:])/g, '$1')
  return all ? all[0].toUpperCase() + all.slice(1) : ''
}

/** Same idea for the on-device iPhone recogniser, which reports the whole current phrase each time: `text` replaces the open phrase, `isFinal` closes it. */
export class CaptionBuffer {
  private done: string[] = []
  private open = ''
  push(text: string, isFinal: boolean): Captions {
    const t = squash(text)
    if (isFinal) { if (t) this.done.push(t); this.open = '' } else this.open = t
    return this.captions()
  }
  captions(): Captions { return { final: this.done.join(' '), interim: this.open } }
  reset() { this.done = []; this.open = '' }
}

import { isNative, Mindful } from './native'
import { CaptionBuffer, mergeParts, type Captions, type SpeechPart } from './speechText.ts'

/**
 * Live captions for the voice journal, always ON THE DEVICE. iPhone app: Apple's on-device recogniser (our Swift plugin; refused if the phone
 * can't do it offline). Browsers: only where the browser itself promises local recognition (`processLocally`); otherwise there are no captions
 * and nothing is sent anywhere. Nothing here uses the network or the AI helper.
 */
export type CaptionSource = 'native' | 'web' | null

interface WebRecognition extends EventTarget { lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean; start(): void; stop(): void; abort(): void
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null }
type WebCtor = (new () => WebRecognition) & { available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string> }
const webCtor = (): WebCtor | null => { const w = window as any; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null }
const webLocal = (C: WebCtor | null) => !!C && 'processLocally' in C.prototype

export async function captionSource(): Promise<CaptionSource> {
  if (isNative()) { try { const r = await Mindful.speechAvailable(); return r.available && r.onDevice ? 'native' : null } catch { return null } }
  return webLocal(webCtor()) ? 'web' : null
}

export interface LiveSession { /** Everything heard so far (settled + the open phrase). */ captions(): Captions; stop(): Promise<Captions> }

export async function startCaptions(onUpdate: (c: Captions) => void, onError: (message: string) => void): Promise<LiveSession> {
  const src = await captionSource()
  if (src === 'native') {
    const buf = new CaptionBuffer()
    const sub = await Mindful.addListener('speechResult', e => onUpdate(buf.push(e.text, e.isFinal)))
    try { await Mindful.speechStart({ locale: navigator.language }) } catch (e) { void sub.remove(); throw new Error((e as { message?: string })?.message || 'Live captions are not available right now.') }
    return {
      captions: () => buf.captions(),
      async stop() { try { await Mindful.speechStop() } catch { /* ignore */ } void sub.remove(); return buf.captions() },
    }
  }
  const C = webCtor()
  if (src !== 'web' || !C) throw new Error('Live captions need the iPhone app (or a browser that recognises speech on the device).')
  const rec = new C(); rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true; rec.processLocally = true
  let running = true, carry = '', current: Captions = { final: '', interim: '' }
  const shown = (c: Captions): Captions => ({ final: `${carry} ${c.final}`.replace(/\s+/g, ' ').trim(), interim: c.interim })
  rec.onresult = e => {
    const parts: SpeechPart[] = Array.from({ length: e.results.length }, (_, i) => ({ text: e.results[i][0].transcript as string, isFinal: !!e.results[i].isFinal }))
    current = shown(mergeParts(parts)); onUpdate(current)
  }
  rec.onerror = e => { if (e.error === 'no-speech' || e.error === 'aborted') return; running = false; onError(e.error === 'not-allowed' ? 'Speech recognition is blocked. Allow it in your browser settings.' : 'Live captions stopped.') }
  rec.onend = () => {                                                              // browsers end the session after a pause: keep what was heard and carry on
    if (!running) return
    carry = `${current.final} ${current.interim}`.replace(/\s+/g, ' ').trim(); current = { final: carry, interim: '' }
    try { rec.start() } catch { /* already started */ }
  }
  rec.start()
  return { captions: () => current, async stop() { running = false; try { rec.stop() } catch { /* ignore */ } return current } }
}

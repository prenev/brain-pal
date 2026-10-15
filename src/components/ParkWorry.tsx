import { useState } from 'react'
import { Sheet } from './ui'
import { Emoji } from '../lib/emoji'
import { useStore } from '../lib/store'

/** Quick capture from the + menu: get it out of your head, deal with it at worry time. */
export default function ParkWorry({ onClose, onOpenWorryTime }: { onClose: () => void; onOpenWorryTime: () => void }) {
  const { addWorry, worries } = useStore()
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const open = worries.filter(w => w.status === 'open').length

  async function save(e: React.FormEvent) {
    e.preventDefault(); const t = text.trim(); if (!t) return
    try { await addWorry(t); setSaved(true); setText('') } catch { setErr('Couldn’t save that. Please try again.') }
  }
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding: 8 }}>
        <div className="row" style={{ marginBottom: 12 }}><Emoji name="worry" size={36} /><b style={{ fontSize: 20 }}>Park a worry</b></div>
        {saved ? <>
          <p style={{ marginTop: 0 }}><b>Parked.</b> You don’t need to solve it right now — it’ll be waiting for worry time. ({open} parked)</p>
          <div className="row"><button className="btn" style={{ flex: 1 }} onClick={() => setSaved(false)}>Park another</button><button className="btn primary" style={{ flex: 1 }} onClick={onOpenWorryTime}>Worry time</button></div>
        </> : <form onSubmit={save}>
          <textarea className="input" autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="What’s the worry?" />
          {err && <p role="alert" style={{ color: 'var(--danger)' }}>{err}</p>}
          <button className="btn primary block" type="submit" disabled={!text.trim()} style={{ marginTop: 12 }}>Park it</button>
        </form>}
      </div>
    </Sheet>
  )
}

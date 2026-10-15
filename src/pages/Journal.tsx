import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Chips } from '../components/ui'
import Entry from '../components/Entry'

export default function Journal() {
  const { thoughts, deleteThought } = useStore()
  const [q, setQ] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const used = useMemo(() => [...new Set(thoughts.flatMap(t => t.tags))], [thoughts])
  const list = thoughts.filter(t =>
    (!tags.length || tags.every(g => t.tags.includes(g))) &&
    (!q || [t.thought, t.situation, t.alternateThought].join(' ').toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <h1>Journal</h1>
      <p className="sub">Every thought, what it did to you, and the better one.</p>
      <input className="input" type="search" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {used.length > 0 && <div style={{ marginBottom: 16 }}><Chips options={used} value={tags} onChange={setTags} /></div>}
      {list.length === 0
        ? <div className="glass card empty">No entries match.</div>
        : list.map(t => <Entry key={t.id} t={t} onDelete={deleteThought} />)}
    </>
  )
}

import { useMemo, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Sheet } from './ui'
import { cardSvg, inviteMessage, stickerSvg, type ShareCard } from '../lib/share.ts'
import { lookFromEquip } from '../lib/cards.ts'
import { useStore } from '../lib/store'
import { POSE_NAMES, POSE_LABEL, palSvg, type PoseName } from '../lib/pal.ts'
import { shareImage, shareText, type ShareResult } from '../lib/shareImage'

const note = (r: ShareResult | null) => r === 'saved' ? 'Saved. Check your downloads or clipboard.' : r === 'failed' ? 'Couldn’t share from here.' : ''

/** Preview of a share card (numbers only, nothing you wrote) with one Share button. */
export function ShareCardSheet({ card, onClose }: { card: ShareCard; onClose: () => void }) {
  const { equip } = useStore()
  const svg = useMemo(() => cardSvg(card, lookFromEquip(equip)), [card, equip])
  const [res, setRes] = useState<ShareResult | null>(null)
  return (
    <Sheet onClose={onClose}>
      <h2 style={{ margin: '0 0 8px' }}>{card.achievement ? card.achievement.title : 'Share your win'}</h2>
      <div className="share-preview" dangerouslySetInnerHTML={{ __html: svg.replace(' width="1080" height="1350"', '') }} />
      <p className="muted small">Only this picture is shared: no entries, no moods, nothing you wrote.</p>
      <button className="btn primary block" onClick={async () => setRes(await shareImage(svg, 1080, 1350, `brain-pal-${card.kind}`, 'Wobbi'))}><Share2 size={18} style={{ display: 'inline', verticalAlign: -3 }} /> Share</button>
      {note(res) && <p className="muted small" role="status">{note(res)}</p>}
      <button className="linkbtn" style={{ display: 'block', margin: '10px auto 0' }} onClick={onClose}>Close</button>
    </Sheet>
  )
}

/** More → Wobbi stickers: tap one to send it to a friend as a transparent PNG. */
export function Stickers() {
  const [res, setRes] = useState<ShareResult | null>(null)
  return (
    <>
      <p className="muted small">Tap a sticker to send it in Messages, WhatsApp, anything. Free, and nothing is tracked.</p>
      <div className="stickers">
        {POSE_NAMES.map((p: PoseName) => (
          <button key={p} className="sticker" aria-label={`Share sticker: ${POSE_LABEL[p]}`} onClick={async () => setRes(await shareImage(stickerSvg(p), 512, 512, `pal-${p}`, 'Wobbi from Wobbi'))}>
            <span dangerouslySetInnerHTML={{ __html: palSvg(p, { size: 72, label: '' }) }} />
          </button>
        ))}
      </div>
      {note(res) && <p className="muted small" role="status">{note(res)}</p>}
    </>
  )
}

export const inviteFriend = () => shareText(inviteMessage(), 'Wobbi')

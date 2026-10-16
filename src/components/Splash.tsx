import Pal from './Pal'

/** Shown while the app starts: Pal and the name, on the same dark colour as the iPhone launch image so nothing flashes. Matches the static markup in index.html. */
export default function Splash() {
  return (
    <div className="splash" role="status" aria-label="Brain Pal is loading">
      <Pal pose="wave" motion="wave" size={170} />
      <h1>Brain Pal</h1>
      <p>Getting things ready…</p>
    </div>
  )
}

import Pal from './Pal'

/** Shown while the app starts: Wobbi and the name, on the same dark colour as the iPhone launch image so nothing flashes. Matches the static markup in index.html. */
export default function Splash() {
  return (
    <div className="splash" role="status" aria-label="Wobbi is loading">
      <Pal pose="wave" motion="wave" size={170} />
      <h1>Wobbi</h1>
    </div>
  )
}

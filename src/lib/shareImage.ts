/** Browser side of sharing: SVG text → PNG → the share sheet (or a download where the browser can't share files). */
export type ShareResult = 'shared' | 'saved' | 'cancelled' | 'failed'

export function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('no image'))), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image failed')) }
    img.src = url
  })
}

export async function shareImage(svg: string, w: number, h: number, name: string, text: string): Promise<ShareResult> {
  try {
    const blob = await svgToPng(svg, w, h)
    const file = new File([blob], `${name}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; /* fall through to saving */ }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.png`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    return 'saved'
  } catch { return 'failed' }
}

export async function shareText(text: string, title = 'Brain Pal'): Promise<ShareResult> {
  try {
    if (navigator.share) { try { await navigator.share({ title, text }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' } }
    await navigator.clipboard.writeText(text); return 'saved'
  } catch { return 'failed' }
}

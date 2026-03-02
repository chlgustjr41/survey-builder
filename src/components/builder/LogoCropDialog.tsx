import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const CROP_DISPLAY  = 240   // px — crop viewport in the dialog
const OUTPUT_SIZE   = 400   // px — exported PNG resolution
const MAX_ZOOM_MULT = 4     // max zoom = minZoom * MAX_ZOOM_MULT

interface DragOrigin { clientX: number; clientY: number; posX: number; posY: number }

interface Props {
  file: File | null
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
}

/** Constrain position so the image always covers the crop viewport. */
function clampPos(x: number, y: number, z: number, w: number, h: number) {
  return {
    x: Math.min(0, Math.max(CROP_DISPLAY - w * z, x)),
    y: Math.min(0, Math.max(CROP_DISPLAY - h * z, y)),
  }
}

export default function LogoCropDialog({ file, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()

  const [imgSrc,   setImgSrc]   = useState<string | null>(null)
  const [naturalW, setNaturalW] = useState(1)
  const [naturalH, setNaturalH] = useState(1)
  const [minZoom,  setMinZoom]  = useState(1)
  const [zoom,     setZoom]     = useState(1)
  const [pos,      setPos]      = useState({ x: 0, y: 0 })

  const dragRef = useRef<DragOrigin | null>(null)

  // Load image whenever file changes
  useEffect(() => {
    if (!file) { setImgSrc(null); return }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const w  = img.naturalWidth  || CROP_DISPLAY
      const h  = img.naturalHeight || CROP_DISPLAY
      // Cover zoom: larger scale factor ensures both dimensions fill the viewport
      const mz = Math.max(CROP_DISPLAY / w, CROP_DISPLAY / h)

      setNaturalW(w);  setNaturalH(h)
      setMinZoom(mz);  setZoom(mz)
      setPos({ x: (CROP_DISPLAY - w * mz) / 2, y: (CROP_DISPLAY - h * mz) / 2 })
    }

    img.src = url
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { clientX: e.clientX, clientY: e.clientY, posX: pos.x, posY: pos.y }
  }
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.clientX
    const dy = e.clientY - dragRef.current.clientY
    setPos(clampPos(dragRef.current.posX + dx, dragRef.current.posY + dy, zoom, naturalW, naturalH))
  }, [zoom, naturalW, naturalH])
  const onPointerUp = () => { dragRef.current = null }

  // ── Zoom slider (0–100 → minZoom … minZoom * MAX_ZOOM_MULT) ──────────────
  const sliderVal = minZoom < zoom
    ? Math.round(((zoom - minZoom) / (minZoom * (MAX_ZOOM_MULT - 1))) * 100)
    : 0

  const onZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct   = Number(e.target.value) / 100
    const newZ  = minZoom + pct * minZoom * (MAX_ZOOM_MULT - 1)
    // Anchor to viewport centre so both axes scale equally from the same focal point
    const cx    = CROP_DISPLAY / 2
    const cy    = CROP_DISPLAY / 2
    const imgCX = (cx - pos.x) / zoom
    const imgCY = (cy - pos.y) / zoom
    setZoom(newZ)
    setPos(clampPos(cx - imgCX * newZ, cy - imgCY * newZ, newZ, naturalW, naturalH))
  }

  // ── Export — square transparent PNG; shape is applied in the side panel ──
  const apply = () => {
    if (!imgSrc) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const ctx = canvas.getContext('2d')!

      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

      const scale = OUTPUT_SIZE / CROP_DISPLAY
      ctx.drawImage(
        img,
        pos.x * scale,
        pos.y * scale,
        naturalW * zoom * scale,
        naturalH * zoom * scale,
      )

      canvas.toBlob(blob => {
        if (!blob) return
        onConfirm(new File([blob], 'logo.png', { type: 'image/png' }))
      }, 'image/png')
    }
    img.src = imgSrc
  }

  return (
    <Dialog open={!!file} onOpenChange={open => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm">{t('builder.qr.cropTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* ── Crop viewport ── */}
          <div
            className="relative select-none overflow-hidden cursor-grab active:cursor-grabbing rounded-lg"
            style={{ width: CROP_DISPLAY, height: CROP_DISPLAY, boxShadow: '0 0 0 4px #e5e7eb' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                style={{
                  position:   'absolute',
                  left:       pos.x,
                  top:        pos.y,
                  width:      naturalW * zoom,
                  height:     naturalH * zoom,
                  maxWidth:   'none',
                  userSelect: 'none',
                }}
              />
            )}
          </div>

          {/* ── Zoom slider ── */}
          <div className="flex items-center gap-2 w-full px-1">
            <span className="text-[10px] text-gray-400 w-14 shrink-0">{t('builder.qr.cropZoom')}</span>
            <input
              type="range" min={0} max={100} step={1} value={sliderVal}
              onChange={onZoomSlider}
              className="flex-1 accent-orange-500 h-1"
            />
          </div>

          <p className="text-[11px] text-gray-400 text-center -mt-1">
            {t('builder.qr.cropHint')}
          </p>

          {/* ── Actions ── */}
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={apply}>
              {t('builder.qr.cropApply')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

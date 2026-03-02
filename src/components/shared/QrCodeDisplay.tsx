import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import QRCodeStyling from 'qr-code-styling'
import type { CornerSquareType, CornerDotType, DotType } from 'qr-code-styling'
import type { QrConfig } from '@/types/survey'

const SQUARE_TYPE: Record<NonNullable<QrConfig['finderShape']>, CornerSquareType> = {
  square:  'square',
  rounded: 'extra-rounded',
  dot:     'dot',
}
const DOT_TYPE: Record<NonNullable<QrConfig['finderShape']>, CornerDotType> = {
  square:  'square',
  rounded: 'dot',
  dot:     'dot',
}
const DATA_DOT_TYPE: Record<NonNullable<QrConfig['dotStyle']>, DotType> = {
  square:  'square',
  rounded: 'extra-rounded',
  dot:     'dots',
}

export const LOGO_SIZE_RATIO: Record<NonNullable<QrConfig['logoSize']>, number> = {
  sm: 0.18,
  md: 0.28,
  lg: 0.40,
}

// ── Imperative handle ──────────────────────────────────────────────────────────
export interface QrCodeDisplayHandle {
  /**
   * Renders the QR code to an offscreen canvas and returns a PNG Blob.
   * Pass `exportSize` to render at a higher resolution than the live display
   * (e.g. 1000 for a print-quality download). The QR options are identical to
   * the live display so the matrix is guaranteed to match.
   */
  getPng(exportSize?: number): Promise<Blob | null>
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  value:     string
  size:      number
  qrConfig?: QrConfig
}

const QrCodeDisplay = forwardRef<QrCodeDisplayHandle, Props>(
  function QrCodeDisplay({ value, size, qrConfig = {} }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const instanceRef  = useRef<QRCodeStyling | null>(null)

    const finderShape   = qrConfig.finderShape ?? 'square'
    const finderColor   = qrConfig.finderColor ?? '#000000'
    const dotStyle      = qrConfig.dotStyle    ?? 'square'
    const dotColor      = qrConfig.dotColor    ?? '#000000'
    const hasLogo       = !!qrConfig.logoUrl
    const logoSize      = qrConfig.logoSize    ?? 'md'
    // data: URL stored in Firebase RTDB — same-origin for canvas, no CORS issues.
    const logoForCanvas = qrConfig.logoDataUrl ?? ''

    // ── Expose getPng via ref ────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        getPng(exportSize?: number): Promise<Blob | null> {
          const renderSize = exportSize ?? size
          const image      = logoForCanvas || undefined
          const offscreen  = new QRCodeStyling({
            type: 'canvas', width: renderSize, height: renderSize, margin: 0,
            data: value,
            qrOptions:            { errorCorrectionLevel: hasLogo ? 'H' : 'M' },
            dotsOptions:          { type: DATA_DOT_TYPE[dotStyle],  color: dotColor    },
            cornersSquareOptions: { type: SQUARE_TYPE[finderShape], color: finderColor },
            cornersDotOptions:    { type: DOT_TYPE[finderShape],    color: finderColor },
            backgroundOptions:    { color: '#ffffff' },
            ...(image ? {
              image,
              imageOptions: {
                imageSize: LOGO_SIZE_RATIO[logoSize] ?? 0.28,
                margin: 2, hideBackgroundDots: true,
              },
            } : {}),
          })
          return offscreen.getRawData('png')
        },
      }),
      [value, size, finderShape, finderColor, dotStyle, dotColor, hasLogo, logoSize, logoForCanvas],
    )

    // ── (Re-)create the QRCodeStyling instance ───────────────────────────────
    // Always creates a fresh instance — update() is unreliable for `image`
    // changes and can silently skip re-renders, causing logo to be missing
    // on page load or after option changes.
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const qr = new QRCodeStyling({
        type:   'canvas',
        width:  size,
        height: size,
        margin: 0,
        data:   value,
        qrOptions:            { errorCorrectionLevel: hasLogo ? 'H' : 'M' },
        dotsOptions:          { type: DATA_DOT_TYPE[dotStyle], color: dotColor },
        cornersSquareOptions: { type: SQUARE_TYPE[finderShape], color: finderColor },
        cornersDotOptions:    { type: DOT_TYPE[finderShape],    color: finderColor },
        backgroundOptions:    { color: '#ffffff' },
        ...(logoForCanvas ? {
          image: logoForCanvas,
          imageOptions: {
            imageSize:          LOGO_SIZE_RATIO[logoSize] ?? 0.28,
            margin:             2,
            hideBackgroundDots: true,
          },
        } : {}),
      })

      instanceRef.current = qr
      container.innerHTML = ''
      qr.append(container)
    }, [value, size, finderShape, finderColor, dotStyle, dotColor, hasLogo,
        logoForCanvas, logoSize])

    return (
      <div style={{ width: size, height: size, display: 'inline-block' }}>
        <div ref={containerRef} />
      </div>
    )
  }
)

export default QrCodeDisplay

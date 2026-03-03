import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useBuilderStore } from '@/stores/builderStore'
import { uploadImage, deleteStorageFile } from '@/services/storageService'
import { getErrorMessage } from '@/lib/errorMessage'
import QrCodeDisplay from '@/components/shared/QrCodeDisplay'
import LogoCropDialog from '@/components/builder/LogoCropDialog'
import type { QrConfig } from '@/types/survey'

const LOGO_SIZES: { value: QrConfig['logoSize']; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
]

const BORDER_RADII: { value: NonNullable<QrConfig['borderRadius']>; label: string; px: number }[] = [
  { value: 'none', label: 'None', px: 0  },
  { value: 'sm',   label: 'S',   px: 8  },
  { value: 'md',   label: 'M',   px: 16 },
  { value: 'lg',   label: 'L',   px: 24 },
]

const FINDER_SHAPES: { value: NonNullable<QrConfig['finderShape']>; label: string }[] = [
  { value: 'square',  label: '□ Square'  },
  { value: 'rounded', label: '◉ Rounded' },
  { value: 'dot',     label: '● Dot'     },
]

const DOT_STYLES: { value: NonNullable<QrConfig['dotStyle']>; label: string }[] = [
  { value: 'square',  label: '□ Square'  },
  { value: 'rounded', label: '▢ Rounded' },
  { value: 'dot',     label: '● Dot'     },
]

const DEFAULT_BORDER_COLOR   = '#e5e7eb'
const DEFAULT_BORDER_RADIUS: NonNullable<QrConfig['borderRadius']>  = 'md'
const DEFAULT_FINDER_COLOR   = '#000000'
const DEFAULT_FINDER_SHAPE: NonNullable<QrConfig['finderShape']>    = 'square'
const DEFAULT_DOT_STYLE: NonNullable<QrConfig['dotStyle']>          = 'square'
const DEFAULT_DOT_COLOR      = '#000000'

const MAX_FILE_MB = 2

/**
 * Resize + compress a data URL to at most `maxPx` × `maxPx` JPEG.
 * Keeps the logo small enough to store in Firebase RTDB (typically ≤ 40 KB base64).
 */
function compressDataUrl(dataUrl: string, maxPx = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round((img.naturalWidth  || maxPx) * scale)
      canvas.height = Math.round((img.naturalHeight || maxPx) * scale)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } else {
        resolve(dataUrl) // fallback: keep original
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Validate & normalise a raw hex string → '#rrggbb' | null */
function parseHex(raw: string): string | null {
  const clean = (raw ?? '').startsWith('#') ? raw.slice(1) : raw
  return /^[0-9A-Fa-f]{6}$/.test(clean) ? `#${clean.toLowerCase()}` : null
}

function Divider() {
  return <div className="border-t border-gray-100 -mx-4" />
}

export default function QrSettingsEditor() {
  const { t } = useTranslation()
  const { draft, updateMeta } = useBuilderStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading,   setUploading]   = useState(false)
  const [cropFile,    setCropFile]    = useState<File | null>(null)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)

  // Local color state for immediate feedback while dragging the color picker
  const [localFinderColor, setLocalFinderColor] = useState(DEFAULT_FINDER_COLOR)
  const [localBorderColor, setLocalBorderColor] = useState(DEFAULT_BORDER_COLOR)
  const [localDotColor,    setLocalDotColor]    = useState(DEFAULT_DOT_COLOR)

  // Hex text draft while the user is typing (null = not editing)
  const [finderColorDraft, setFinderColorDraft] = useState<string | null>(null)
  const [borderColorDraft, setBorderColorDraft] = useState<string | null>(null)
  const [dotColorDraft,    setDotColorDraft]    = useState<string | null>(null)

  const finderColorTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const borderColorTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const dotColorTimer    = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync local color state when the store resets it externally
  useEffect(() => {
    setLocalFinderColor(draft?.qrConfig?.finderColor ?? DEFAULT_FINDER_COLOR)
  }, [draft?.qrConfig?.finderColor])

  useEffect(() => {
    setLocalBorderColor(draft?.qrConfig?.borderColor ?? DEFAULT_BORDER_COLOR)
  }, [draft?.qrConfig?.borderColor])

  useEffect(() => {
    setLocalDotColor(draft?.qrConfig?.dotColor ?? DEFAULT_DOT_COLOR)
  }, [draft?.qrConfig?.dotColor])

  if (!draft) return null

  const qr = draft.qrConfig ?? {}
  const surveyUrl = `${window.location.origin}/s/${draft.id}`

  const update = (patch: Partial<QrConfig>) => {
    updateMeta({ qrConfig: { ...qr, ...patch } })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(t('builder.qr.logoTooBig', { mb: MAX_FILE_MB }))
      return
    }

    setCropFile(file)
  }

  const handleCropConfirm = async (croppedFile: File) => {
    const oldUrl = qr.logoUrl
    setCropFile(null)

    // Await FileReader as a Promise so we can make ONE atomic update() at the end.
    // Two separate update() calls (even if one fires from inside a callback) both
    // spread the same stale `qr` snapshot captured at render time, so the second
    // call silently overwrites whatever the first one wrote.
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(croppedFile)
    })

    setLogoDataUrl(raw)                          // full quality for local preview
    const compressed = await compressDataUrl(raw) // ≤ 256 px JPEG for canvas export

    setUploading(true)
    try {
      if (oldUrl) deleteStorageFile(oldUrl).catch(() => {})
      const url = await uploadImage(croppedFile, 'qr-logos')
      // Single atomic update — both logoUrl and logoDataUrl land in one spread,
      // so neither field can overwrite the other via a stale qr closure.
      update({ logoUrl: url, logoDataUrl: compressed })
    } catch (err) {
      const { message, detail } = getErrorMessage(err, 'Failed to upload logo')
      toast.error(message, { description: detail })
      setLogoDataUrl(null)
      update({ logoDataUrl: undefined })
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = () => {
    if (qr.logoUrl) deleteStorageFile(qr.logoUrl).catch(() => {})
    setLogoDataUrl(null)
    const { logoUrl: _l, logoSize: _s, logoDataUrl: _ld, ...rest } = qr
    updateMeta({ qrConfig: Object.keys(rest).length ? rest : undefined })
  }

  const borderRadiusPx = BORDER_RADII.find((r) => r.value === (qr.borderRadius ?? DEFAULT_BORDER_RADIUS))?.px ?? 16
  const finderShape    = qr.finderShape ?? DEFAULT_FINDER_SHAPE
  const dotStyle       = qr.dotStyle    ?? DEFAULT_DOT_STYLE

  const hasBorderCustomization =
    (qr.borderColor && qr.borderColor !== DEFAULT_BORDER_COLOR) ||
    (qr.borderRadius && qr.borderRadius !== DEFAULT_BORDER_RADIUS)

  const hasFinderCustomization =
    (qr.finderColor && qr.finderColor !== DEFAULT_FINDER_COLOR) ||
    (qr.finderShape && qr.finderShape !== DEFAULT_FINDER_SHAPE)

  const hasDotStyleCustomization = qr.dotStyle && qr.dotStyle !== DEFAULT_DOT_STYLE
  const hasDotColorCustomization = qr.dotColor && qr.dotColor !== DEFAULT_DOT_COLOR
  const hasDotCustomization      = hasDotStyleCustomization || hasDotColorCustomization

  // Supply logoDataUrl as both logoUrl (for hasLogo check) and logoDataUrl
  // (for canvas embedding) so the preview QR embeds the logo natively via
  // QRCodeStyling's image option rather than as an HTML <img> overlay.
  const previewQrConfig = logoDataUrl
    ? { ...qr, logoUrl: logoDataUrl, logoDataUrl: logoDataUrl }
    : qr

  // ── Reusable editable colour row ────────────────────────────────────────────
  const ColorPickerRow = ({
    color, draft: draftVal,
    onColorChange, onDraftChange, onFocus, onBlur,
    timerRef, storeUpdate,
  }: {
    color: string
    draft: string | null
    onColorChange: (v: string) => void
    onDraftChange: (v: string | null) => void
    onFocus: () => void
    onBlur: () => void
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>
    storeUpdate: (c: string) => void
  }) => (
    <label className="flex items-center gap-1.5 h-8 px-2 rounded-md border border-gray-200 bg-white cursor-pointer w-full">
      {/* Colour swatch — native picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => {
          const v = e.target.value
          onColorChange(v)
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => storeUpdate(v), 150)
        }}
        onBlur={(e) => {
          clearTimeout(timerRef.current)
          storeUpdate(e.target.value)
        }}
        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
      />
      {/* # prefix */}
      <span className="text-xs text-gray-400 font-mono shrink-0 select-none">#</span>
      {/* Editable hex text field */}
      <input
        type="text"
        value={draftVal ?? color.replace('#', '').toUpperCase()}
        maxLength={6}
        spellCheck={false}
        onFocus={onFocus}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase()
          onDraftChange(raw)
          if (raw.length === 6) {
            const parsed = `#${raw.toLowerCase()}`
            onColorChange(parsed)
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => storeUpdate(parsed), 150)
          }
        }}
        onBlur={() => {
          const parsed = parseHex(draftVal ?? '')
          if (parsed) {
            clearTimeout(timerRef.current)
            storeUpdate(parsed)
            onColorChange(parsed)
          } else {
            onColorChange(color) // revert to last valid
          }
          onBlur()
        }}
        className="flex-1 min-w-0 text-xs text-gray-600 font-mono uppercase bg-transparent outline-none focus:text-orange-600 cursor-text"
        placeholder="000000"
      />
    </label>
  )

  return (
    <>
    <div className="flex flex-col gap-4">

      {/* Live preview */}
      <div className="flex justify-center">
        <div
          className="p-3 bg-white inline-block shadow-sm"
          style={{ border: `2px solid ${localBorderColor}`, borderRadius: borderRadiusPx }}
        >
          <QrCodeDisplay
            value={surveyUrl}
            size={140}
            qrConfig={previewQrConfig}
          />
        </div>
      </div>

      <Divider />

      {/* Logo upload */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.qr.logo')}
        </p>

        {qr.logoUrl ? (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <img
              src={logoDataUrl ?? qr.logoUrl}
              alt="QR logo"
              className="w-10 h-10 object-cover rounded shrink-0"
            />
            <p className="flex-1 text-xs text-gray-500 truncate">{t('builder.qr.logoUploaded')}</p>
            <button
              onClick={removeLogo}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title={t('builder.qr.removeLogo')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.14 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('builder.qr.uploading')}</>
              ) : (
                <><Upload className="w-3.5 h-3.5" />{t('builder.qr.uploadLogo')}</>
              )}
            </Button>
          </motion.div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <p className="text-[10px] text-gray-400 leading-snug">{t('builder.qr.logoHint')}</p>
      </div>

      {/* Logo size (only when a logo exists) */}
      {qr.logoUrl && (
        <>
          <Divider />
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              {t('builder.qr.logoSize')}
            </p>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {LOGO_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update({ logoSize: s.value })}
                  className={`flex-1 py-1.5 transition-colors ${
                    (qr.logoSize ?? 'md') === s.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Divider />

      {/* QR Dots — shape + color */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.qr.dotStyle')}
        </p>

        {/* Dot shape */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.dotShape')}</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {DOT_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => update({ dotStyle: s.value })}
                className={`flex-1 py-1.5 transition-colors ${
                  dotStyle === s.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dot color */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.dotColor')}</span>
          <ColorPickerRow
            color={localDotColor}
            draft={dotColorDraft}
            onColorChange={(v) => setLocalDotColor(v)}
            onDraftChange={(v) => setDotColorDraft(v)}
            onFocus={() => setDotColorDraft(localDotColor.replace('#', '').toUpperCase())}
            onBlur={() => setDotColorDraft(null)}
            timerRef={dotColorTimer}
            storeUpdate={(c) => update({ dotColor: c })}
          />
        </div>

        {hasDotCustomization && (
          <button
            onClick={() => {
              clearTimeout(dotColorTimer.current)
              setLocalDotColor(DEFAULT_DOT_COLOR)
              update({ dotStyle: undefined, dotColor: undefined })
            }}
            className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors text-left"
          >
            {t('builder.qr.resetDotStyle')}
          </button>
        )}
      </div>

      <Divider />

      {/* Finder patterns (corner squares / eyes) */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.qr.finderPatterns')}
        </p>

        {/* Finder color */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.finderColor')}</span>
          <ColorPickerRow
            color={localFinderColor}
            draft={finderColorDraft}
            onColorChange={(v) => setLocalFinderColor(v)}
            onDraftChange={(v) => setFinderColorDraft(v)}
            onFocus={() => setFinderColorDraft(localFinderColor.replace('#', '').toUpperCase())}
            onBlur={() => setFinderColorDraft(null)}
            timerRef={finderColorTimer}
            storeUpdate={(c) => update({ finderColor: c })}
          />
        </div>

        {/* Finder shape */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.finderShape')}</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {FINDER_SHAPES.map((s) => (
              <button
                key={s.value}
                onClick={() => update({ finderShape: s.value })}
                className={`flex-1 py-1.5 transition-colors ${
                  finderShape === s.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {hasFinderCustomization && (
          <button
            onClick={() => {
              clearTimeout(finderColorTimer.current)
              setLocalFinderColor(DEFAULT_FINDER_COLOR)
              update({ finderColor: undefined, finderShape: undefined })
            }}
            className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors text-left"
          >
            {t('builder.qr.resetFinder')}
          </button>
        )}
      </div>

      <Divider />

      {/* Border */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
          {t('builder.qr.border')}
        </p>

        {/* Border color */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.borderColor')}</span>
          <ColorPickerRow
            color={localBorderColor}
            draft={borderColorDraft}
            onColorChange={(v) => setLocalBorderColor(v)}
            onDraftChange={(v) => setBorderColorDraft(v)}
            onFocus={() => setBorderColorDraft(localBorderColor.replace('#', '').toUpperCase())}
            onBlur={() => setBorderColorDraft(null)}
            timerRef={borderColorTimer}
            storeUpdate={(c) => update({ borderColor: c })}
          />
        </div>

        {/* Border roundness */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-500">{t('builder.qr.borderRadius')}</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            {BORDER_RADII.map((r) => (
              <button
                key={r.value}
                onClick={() => update({ borderRadius: r.value })}
                className={`flex-1 py-1.5 transition-colors ${
                  (qr.borderRadius ?? DEFAULT_BORDER_RADIUS) === r.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {hasBorderCustomization && (
          <button
            onClick={() => {
              clearTimeout(borderColorTimer.current)
              setLocalBorderColor(DEFAULT_BORDER_COLOR)
              update({ borderColor: undefined, borderRadius: undefined })
            }}
            className="text-[10px] text-gray-400 hover:text-orange-500 transition-colors text-left"
          >
            {t('builder.qr.resetBorder')}
          </button>
        )}
      </div>
    </div>

    <LogoCropDialog
      file={cropFile}
      onConfirm={handleCropConfirm}
      onCancel={() => setCropFile(null)}
    />
    </>
  )
}

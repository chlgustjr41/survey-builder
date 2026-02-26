import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useBuilderStore } from '@/stores/builderStore'
import type { Question } from '@/types/question'

interface Props { question: Question }

export default function ScaleEditor({ question }: Props) {
  const { updateQuestion } = useBuilderStore()
  const cfg = question.scaleConfig ?? { min: 1, max: 5, useValueAsPoints: false }
  const rangeError = cfg.max <= cfg.min ? 'Max must be greater than min' : null

  // Derive a preview of scale buttons (cap at 10 for display)
  const steps = Array.from(
    { length: Math.min(cfg.max - cfg.min + 1, 10) },
    (_, i) => cfg.min + i
  )
  const isTruncated = cfg.max - cfg.min + 1 > 10

  return (
    <div className="flex flex-col gap-3 mt-2">

      {/* Range inputs */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Range</span>
          <Input
            type="number"
            className={`w-14 h-7 text-xs ${rangeError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            value={cfg.min}
            onChange={(e) =>
              updateQuestion(question.id, { scaleConfig: { ...cfg, min: Number(e.target.value) } })
            }
          />
          <span className="text-xs text-gray-400">–</span>
          <Input
            type="number"
            className={`w-14 h-7 text-xs ${rangeError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            value={cfg.max}
            onChange={(e) =>
              updateQuestion(question.id, { scaleConfig: { ...cfg, max: Number(e.target.value) } })
            }
          />
        </div>
        {rangeError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span> {rangeError}
          </p>
        )}
      </div>

      {/* End labels */}
      <div className="flex items-center gap-2">
        <Input
          className="h-7 text-xs"
          placeholder="Min label (e.g. Poor)"
          value={cfg.minLabel ?? ''}
          onChange={(e) =>
            updateQuestion(question.id, { scaleConfig: { ...cfg, minLabel: e.target.value } })
          }
        />
        <Input
          className="h-7 text-xs"
          placeholder="Max label (e.g. Excellent)"
          value={cfg.maxLabel ?? ''}
          onChange={(e) =>
            updateQuestion(question.id, { scaleConfig: { ...cfg, maxLabel: e.target.value } })
          }
        />
      </div>

      {/* Scale preview */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 flex-wrap">
          {steps.map((n) => (
            <div
              key={n}
              className="min-w-8 px-2 py-1 rounded border border-gray-200 text-xs text-gray-500 text-center bg-gray-50"
            >
              {n}
            </div>
          ))}
          {isTruncated && (
            <div className="px-2 py-1 text-xs text-gray-400">…{cfg.max}</div>
          )}
        </div>
        {(cfg.minLabel || cfg.maxLabel) && (
          <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
            <span>{cfg.minLabel}</span>
            <span>{cfg.maxLabel}</span>
          </div>
        )}
      </div>

      {/* Points toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          <p className="text-xs font-medium text-gray-700">Use scale value as points</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {cfg.useValueAsPoints
              ? `Selecting ${cfg.max} awards ${cfg.max} pts; selecting ${cfg.min} awards ${cfg.min} pts.`
              : 'Scale response will not contribute to the score.'}
          </p>
        </div>
        <Switch
          checked={cfg.useValueAsPoints}
          onCheckedChange={(v) =>
            updateQuestion(question.id, { scaleConfig: { ...cfg, useValueAsPoints: v } })
          }
          className="scale-[0.85] origin-right"
        />
      </div>
    </div>
  )
}

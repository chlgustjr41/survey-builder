import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { Response, ResponseFilters } from '@/types/response'
import type { Survey } from '@/types/survey'
import { getMaxPossibleScore } from '@/lib/scoring'

interface Props {
  responses: Response[]
  survey: Survey | null
  filters: ResponseFilters
  onFiltersChange: (f: ResponseFilters) => void
  onSelect: (r: Response) => void
  selectedId: string | undefined
}

export default function ResponseList({ responses, survey, filters, onFiltersChange, onSelect, selectedId }: Props) {
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)
  const maxScore = survey ? getMaxPossibleScore(survey.questions) : 100

  const filtered = responses.filter((r) => {
    if (filters.scoreMin !== undefined && r.totalScore < filters.scoreMin) return false
    if (filters.scoreMax !== undefined && r.totalScore > filters.scoreMax) return false
    if (filters.dateFrom !== undefined && r.respondedAt < filters.dateFrom) return false
    if (filters.dateTo !== undefined && r.respondedAt > filters.dateTo) return false
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      if (!Object.values(r.identification).some((v) => v.toLowerCase().includes(q))) return false
    }
    return true
  })

  const clearFilters = () => onFiltersChange({})
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  return (
    <div className="flex flex-col gap-3">
      {/* Search + filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            className="pl-8 text-sm h-9"
            placeholder={t('responses.filters.search')}
            value={filters.searchQuery ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value || undefined })}
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className={showFilters ? 'bg-orange-500 text-white' : ''}
        >
          <Filter className="w-3.5 h-3.5 mr-1" />
          {t('responses.filters.title')}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" />
            {t('responses.filters.clear')}
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              {t('responses.filters.scoreRange')}: {filters.scoreMin ?? 0} – {filters.scoreMax ?? maxScore}
            </label>
            <Slider
              min={0}
              max={maxScore || 100}
              step={1}
              value={[filters.scoreMin ?? 0, filters.scoreMax ?? maxScore]}
              onValueChange={([min, max]) => onFiltersChange({ ...filters, scoreMin: min, scoreMax: max })}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <Input
                type="date"
                className="text-xs h-8"
                value={filters.dateFrom ? new Date(filters.dateFrom).toISOString().slice(0, 10) : ''}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).getTime() : undefined })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <Input
                type="date"
                className="text-xs h-8"
                value={filters.dateTo ? new Date(filters.dateTo).toISOString().slice(0, 10) : ''}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59').getTime() : undefined })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Response rows */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">{t('responses.noResponses')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => {
            const name = r.identification.name ?? r.identification.email ?? Object.values(r.identification)[0] ?? '—'
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${selectedId === r.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'}`}
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(r.respondedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-500">{r.totalScore}</p>
                  <p className="text-xs text-gray-400">{t('result.outOf')} {maxScore}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

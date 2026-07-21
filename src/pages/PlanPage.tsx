import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  clearPlanEntry,
  listPlanEntries,
  listRecipes,
  upsertPlanEntry,
} from '../lib/api'
import {
  formatDayLabel,
  formatRangeLabel,
  isSameDay,
  nextSevenDays,
  toISODate,
} from '../lib/dates'
import type { PlanEntry, Recipe } from '../lib/types'

export function PlanPage() {
  const days = useMemo(() => nextSevenDays(), [])
  const from = toISODate(days[0])
  const to = toISODate(days[6])

  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const [plan, recipeList] = await Promise.all([
        listPlanEntries(from, to),
        listRecipes(),
      ])
      setEntries(plan)
      setRecipes(recipeList)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load plan')
    }
  }

  useEffect(() => {
    void refresh()
  }, [from, to])

  const byDate = useMemo(() => {
    const map = new Map<string, PlanEntry>()
    for (const e of entries) map.set(e.date, e)
    return map
  }, [entries])

  useEffect(() => {
    if (!selectedDate) return
    const entry = byDate.get(selectedDate)
    setNotes(entry?.notes ?? '')
    setLabel(entry?.recipe_id ? '' : (entry?.label ?? ''))
  }, [selectedDate, byDate])

  const plannedCount = entries.filter((e) => e.recipe_id || e.label).length
  const selectedEntry = selectedDate ? byDate.get(selectedDate) : undefined

  async function assignRecipe(recipe: Recipe) {
    if (!selectedDate) return
    setBusy(true)
    try {
      await upsertPlanEntry({
        date: selectedDate,
        recipe_id: recipe.id,
        label: recipe.title,
        notes: notes.trim(),
      })
      setSelectedDate(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function assignLabel(e: FormEvent) {
    e.preventDefault()
    if (!selectedDate || !label.trim()) return
    setBusy(true)
    try {
      await upsertPlanEntry({
        date: selectedDate,
        recipe_id: null,
        label: label.trim(),
        notes: notes.trim(),
      })
      setLabel('')
      setSelectedDate(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function saveNotes() {
    if (!selectedDate) return
    setBusy(true)
    try {
      await upsertPlanEntry({
        date: selectedDate,
        recipe_id: selectedEntry?.recipe_id ?? null,
        label: selectedEntry?.label ?? null,
        notes: notes.trim(),
      })
      setSelectedDate(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function clearDay() {
    if (!selectedDate) return
    setBusy(true)
    try {
      await clearPlanEntry(selectedDate)
      setSelectedDate(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ paddingTop: 16 }}>
      <h1 className="page-title">Next 7 days</h1>
      <p className="meta">
        {formatRangeLabel(days)} · {plannedCount === 1 ? '1 dinner planned' : `${plannedCount} dinners planned`}
      </p>

      {error ? <p className="error">{error}</p> : null}

      <div className="stack">
        {days.map((day) => {
          const iso = toISODate(day)
          const entry = byDate.get(iso)
          const meal = entry?.label || entry?.recipe?.title
          const dayNotes = entry?.notes?.trim()
          const today = isSameDay(day, new Date())
          return (
            <button
              key={iso}
              type="button"
              className={`day-row ${today ? 'today' : ''}`}
              onClick={() => setSelectedDate(iso)}
            >
              <span className="d">{formatDayLabel(day)}</span>
              <span className="meal-block">
                <span className={`meal ${meal ? '' : 'empty'}`}>{meal || '+ add a dinner'}</span>
                {dayNotes ? <span className="day-note">{dayNotes}</span> : null}
              </span>
              {today ? <span className="today-tag">TODAY</span> : null}
            </button>
          )
        })}
      </div>

      {selectedDate ? (
        <div className="modal-backdrop" onClick={() => setSelectedDate(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title" style={{ fontSize: 22 }}>
              Plan {selectedDate}
            </h2>
            <p className="meta">Pick a recipe or type a free-text dinner.</p>

            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="plan-notes">Note</label>
              <textarea
                id="plan-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Side: roasted broccoli, rice…"
              />
            </div>
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => void saveNotes()}
            >
              Save note
            </button>

            <form className="stack" onSubmit={assignLabel} style={{ marginTop: 16 }}>
              <div className="field">
                <label htmlFor="label">Free text</label>
                <input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Leftovers, takeout…"
                />
              </div>
              <button type="submit" className="btn secondary" disabled={busy || !label.trim()}>
                Save label
              </button>
            </form>

            <div className="label" style={{ marginTop: 16 }}>
              From our recipes
            </div>
            <div className="card-list" style={{ maxHeight: 240, overflow: 'auto' }}>
              {recipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="recipe-row"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }}
                  disabled={busy}
                  onClick={() => void assignRecipe(r)}
                >
                  <div className="thumb">{r.title.charAt(0)}</div>
                  <div className="body">
                    <h3>{r.title}</h3>
                    <p>{r.cook_time_minutes ? `${r.cook_time_minutes} min` : 'Recipe'}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn quiet" onClick={() => setSelectedDate(null)}>
                Cancel
              </button>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => void clearDay()}>
                Clear day
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

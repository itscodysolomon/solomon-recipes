import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  clearPlanEntry,
  errorMessage,
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
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
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
      setError(errorMessage(err, 'Could not load plan'))
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
    setRecipeId(entry?.recipe_id ?? null)
    setLabel(entry?.recipe_id ? '' : (entry?.label ?? ''))
    setNotes(entry?.notes ?? '')
  }, [selectedDate, byDate])

  const plannedCount = entries.filter((e) => e.recipe_id || e.label).length
  const selectedRecipe = recipeId ? recipes.find((r) => r.id === recipeId) : undefined
  const canSave = Boolean(recipeId || label.trim() || notes.trim())

  function pickRecipe(recipe: Recipe) {
    setRecipeId(recipe.id)
    setLabel('')
  }

  function onLabelChange(value: string) {
    setLabel(value)
    if (value.trim()) setRecipeId(null)
  }

  async function saveDay(e: FormEvent) {
    e.preventDefault()
    if (!selectedDate || !canSave) return
    setBusy(true)
    try {
      const result =
        recipeId && selectedRecipe
          ? await upsertPlanEntry({
              date: selectedDate,
              recipe_id: selectedRecipe.id,
              label: selectedRecipe.title,
              notes: notes.trim(),
            })
          : await upsertPlanEntry({
              date: selectedDate,
              recipe_id: null,
              label: label.trim() || null,
              notes: notes.trim(),
            })
      setSelectedDate(null)
      setNotice(result.warning ?? '')
      setError('')
      await refresh()
    } catch (err) {
      setError(errorMessage(err, 'Could not save'))
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
      {notice ? <p className="meta">{notice}</p> : null}

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
            <p className="meta">Pick a recipe or type a dinner, add a side if you want, then save.</p>
            {error ? <p className="error">{error}</p> : null}

            <form className="stack" onSubmit={saveDay} style={{ marginTop: 12 }}>
              <div className="label">From our recipes</div>
              <div className="card-list" style={{ maxHeight: 220, overflow: 'auto' }}>
                {recipes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`recipe-row ${recipeId === r.id ? 'selected' : ''}`}
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    disabled={busy}
                    onClick={() => pickRecipe(r)}
                  >
                    <div className="thumb">{r.title.charAt(0)}</div>
                    <div className="body">
                      <h3>{r.title}</h3>
                      <p>{r.cook_time_minutes ? `${r.cook_time_minutes} min` : 'Recipe'}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="field">
                <label htmlFor="label">Or type a dinner</label>
                <input
                  id="label"
                  value={label}
                  onChange={(e) => onLabelChange(e.target.value)}
                  placeholder="Leftovers, takeout…"
                />
              </div>

              <div className="field">
                <label htmlFor="plan-notes">Side or note</label>
                <textarea
                  id="plan-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Roasted broccoli, rice…"
                />
              </div>

              <div className="btn-row">
                <button type="button" className="btn quiet" onClick={() => setSelectedDate(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={busy || !canSave}>
                  Save
                </button>
              </div>
              <button type="button" className="btn secondary" disabled={busy} onClick={() => void clearDay()}>
                Clear day
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteRecipe, getRecipe, updateRecipe } from '../lib/api'
import { recipePhotoUrl } from '../lib/recipePhotos'
import { scaleIngredients } from '../lib/scale'
import type { Recipe } from '../lib/types'

export function RecipePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [servings, setServings] = useState(4)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    void getRecipe(id)
      .then((r) => {
        setRecipe(r)
        setServings(r?.servings || 4)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [id])

  const scaled = useMemo(() => {
    if (!recipe) return []
    const base = recipe.servings || 4
    return scaleIngredients(recipe.ingredients, base, servings)
  }, [recipe, servings])

  if (error) return <p className="error pad">{error}</p>
  if (!recipe) return <p className="muted pad">Loading…</p>

  const hasIngredients = recipe.ingredients.length > 0
  const hasSteps = recipe.steps.length > 0
  const photo = recipePhotoUrl(recipe.photo_path)

  async function remove() {
    if (!confirm(`Delete “${recipe!.title}”?`)) return
    await deleteRecipe(recipe!.id)
    navigate('/')
  }

  async function toggleFavorite() {
    const next = await updateRecipe(recipe!.id, { favorite: !recipe!.favorite })
    setRecipe(next)
  }

  return (
    <div className="stack" style={{ paddingTop: 16 }}>
      <Link to="/" className="meta no-print">
        ← Recipes
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
        <h1 className="page-title">{recipe.title}</h1>
        <button type="button" className="heart no-print" onClick={() => void toggleFavorite()}>
          {recipe.favorite ? '♥' : '♡'}
        </button>
      </div>
      {photo ? <img className="recipe-photo" src={photo} alt={recipe.title} /> : null}
      <p className="meta">
        {[
          recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : null,
          recipe.times_cooked > 0 ? `made ${recipe.times_cooked}×` : null,
          recipe.last_cooked_at
            ? `last cooked ${new Date(recipe.last_cooked_at).toLocaleDateString()}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Recipe'}
      </p>
      {recipe.tags.length > 0 ? (
        <div className="chip-row">
          {recipe.tags.map((t) => (
            <span key={t} className={`chip ${['Dairy-free', 'Paleo', 'Healthy'].includes(t) ? 'diet' : ''}`}>
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {hasIngredients ? (
        <>
          <div className="scaler no-print">
            <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))}>
              −
            </button>
            <div className="count">{servings} servings</div>
            <button type="button" onClick={() => setServings((s) => s + 1)}>
              +
            </button>
          </div>
          <div className="label">Ingredients</div>
          <div className="check-list">
            {scaled.map((ing, i) => (
              <label key={`${ing.text}-${i}`} className={`check-row ${checked[i] ? 'done' : ''}`}>
                <input
                  type="checkbox"
                  checked={Boolean(checked[i])}
                  onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                />
                <span>{ing.text}</span>
              </label>
            ))}
          </div>
        </>
      ) : (
        <div className="note-card" style={{ background: '#fff', border: '1px dashed rgba(46,38,32,0.25)' }}>
          <div className="label">No ingredients yet</div>
          <p>Add a few to pull this into the shopping list — or don&apos;t.</p>
        </div>
      )}

      {recipe.notes ? (
        <div className="note-card">
          <div className="label">{hasIngredients || hasSteps ? 'Our notes' : 'How we make it'}</div>
          <p>{recipe.notes}</p>
        </div>
      ) : null}

      {hasSteps ? (
        <>
          <div className="label">Steps</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {recipe.steps.map((step, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {step}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div className="btn-row no-print">
        <Link className="btn primary" to={`/add?edit=${recipe.id}`}>
          Edit recipe
        </Link>
      </div>

      <div className="btn-row no-print">
        <button type="button" className="btn quiet" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="btn quiet" onClick={() => void remove()}>
          Delete
        </button>
      </div>
    </div>
  )
}

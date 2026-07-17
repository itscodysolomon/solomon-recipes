import { useEffect, useMemo, useState } from 'react'
import { MasonryHero } from '../components/Layout'
import { RecipeRow } from '../components/RecipeRow'
import { listRecipes, updateRecipe } from '../lib/api'
import { COMMON_TAGS, type Recipe } from '../lib/types'

export function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('All')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      setRecipes(await listRecipes())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load recipes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      const matchesQuery = !q || r.title.toLowerCase().includes(q)
      const matchesTag =
        tag === 'All' ||
        (tag === 'Favorites' && r.favorite) ||
        r.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      return matchesQuery && matchesTag
    })
  }, [recipes, query, tag])

  const oftenMade = useMemo(
    () =>
      [...filtered]
        .filter((r) => r.times_cooked > 0 || r.favorite)
        .sort((a, b) => b.times_cooked - a.times_cooked || Number(b.favorite) - Number(a.favorite))
        .slice(0, 6),
    [filtered],
  )

  async function toggleFavorite(recipe: Recipe) {
    const next = await updateRecipe(recipe.id, { favorite: !recipe.favorite })
    setRecipes((prev) => prev.map((r) => (r.id === next.id ? next : r)))
  }

  const chips = ['All', 'Favorites', ...COMMON_TAGS]

  return (
    <>
      <MasonryHero />
      <div className="pad stack">
        <input
          className="search"
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chip-row">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${tag === c ? 'on' : ''} ${['Dairy-free', 'Paleo', 'Healthy'].includes(c) ? 'diet' : ''}`}
              onClick={() => setTag(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p className="muted">Loading recipes…</p> : null}

        {!loading && oftenMade.length > 0 ? (
          <>
            <div className="label">Often made</div>
            <div className="card-list">
              {oftenMade.map((r) => (
                <RecipeRow key={`often-${r.id}`} recipe={r} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          </>
        ) : null}

        <div className="label">All recipes</div>
        <div className="card-list">
          {filtered.length === 0 && !loading ? (
            <p className="muted">No recipes yet. Tap Add to save one.</p>
          ) : (
            filtered.map((r) => (
              <RecipeRow key={r.id} recipe={r} onToggleFavorite={toggleFavorite} />
            ))
          )}
        </div>
      </div>
    </>
  )
}

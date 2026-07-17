import { Link } from 'react-router-dom'
import { recipePhotoUrl } from '../lib/recipePhotos'
import type { Recipe } from '../lib/types'

export function RecipeRow({
  recipe,
  onToggleFavorite,
}: {
  recipe: Recipe
  onToggleFavorite?: (recipe: Recipe) => void
}) {
  const thumb = recipePhotoUrl(recipe.photo_path)
  const metaParts = [
    recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : null,
    recipe.times_cooked > 0 ? `made ${recipe.times_cooked}×` : null,
    !recipe.ingredients.length && recipe.notes ? recipe.notes.slice(0, 48) : null,
  ].filter(Boolean)

  return (
    <Link to={`/recipes/${recipe.id}`} className="recipe-row">
      <div className="thumb">
        {thumb ? <img src={thumb} alt="" /> : recipe.title.charAt(0).toUpperCase()}
      </div>
      <div className="body">
        <h3>{recipe.title}</h3>
        <p>{metaParts.join(' · ') || 'Recipe'}</p>
      </div>
      {onToggleFavorite ? (
        <button
          type="button"
          className="heart"
          aria-label={recipe.favorite ? 'Unfavorite' : 'Favorite'}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleFavorite(recipe)
          }}
        >
          {recipe.favorite ? '♥' : '♡'}
        </button>
      ) : null}
    </Link>
  )
}

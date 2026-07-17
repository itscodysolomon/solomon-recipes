import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createRecipe, getRecipe, updateRecipe } from '../lib/api'
import { importRecipeFromUrl } from '../lib/importRecipe'
import { recipePhotoUrl, saveRecipePhoto } from '../lib/recipePhotos'
import { COMMON_TAGS, type Ingredient } from '../lib/types'

export function AddRecipePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('edit')

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [stepsText, setStepsText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('4')
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [showExtras, setShowExtras] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!editId) return
    void getRecipe(editId).then((r) => {
      if (!r) return
      setTitle(r.title)
      setNotes(r.notes)
      setIngredientsText(r.ingredients.map((i) => i.text).join('\n'))
      setStepsText(r.steps.join('\n'))
      setTags(r.tags)
      setCookTime(r.cook_time_minutes ? String(r.cook_time_minutes) : '')
      setServings(String(r.servings || 4))
      setPhotoPath(r.photo_path)
      setShowExtras(true)
    })
  }, [editId])

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(recipePhotoUrl(photoPath))
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile, photoPath])

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  async function onImport() {
    setError('')
    setBusy(true)
    try {
      const imported = await importRecipeFromUrl(importUrl.trim())
      setTitle(imported.title)
      setNotes(imported.notes)
      setIngredientsText(imported.ingredients.join('\n'))
      setStepsText(imported.steps.join('\n'))
      if (imported.cook_time_minutes) setCookTime(String(imported.cook_time_minutes))
      if (imported.servings) setServings(String(imported.servings))
      if (imported.image) {
        setPhotoFile(null)
        setPhotoPath(imported.image)
      }
      setShowExtras(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setBusy(true)
    setError('')
    try {
      const ingredients: Ingredient[] = ingredientsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text }))

      const steps = stepsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      const savedPhotoPath = photoFile ? await saveRecipePhoto(photoFile) : photoPath
      const payload = {
        title: title.trim(),
        notes: notes.trim(),
        ingredients,
        steps,
        tags,
        cook_time_minutes: cookTime ? Number(cookTime) : null,
        servings: servings ? Number(servings) : 4,
        photo_path: savedPhotoPath,
      }

      const recipe = editId
        ? await updateRecipe(editId, payload)
        : await createRecipe(payload)

      navigate(`/recipes/${recipe.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="stack" style={{ paddingTop: 16 }} onSubmit={onSubmit}>
      <Link to={editId ? `/recipes/${editId}` : '/'} className="meta">
        ← Cancel
      </Link>
      <h1 className="page-title">{editId ? 'Edit recipe' : 'New recipe'}</h1>

      <div className="note-card">
        <div className="label">Have a link?</div>
        <input
          className="search"
          style={{ marginTop: 8 }}
          placeholder="Paste a Pinterest or recipe URL…"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn quiet"
          style={{ marginTop: 8, background: 'var(--espresso)', color: 'var(--cream)' }}
          disabled={!importUrl.trim() || busy}
          onClick={() => void onImport()}
        >
          Import
        </button>
      </div>

      <div className="field">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Salmon + Broccoli"
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How we make it, or see p. 23 of…"
        />
      </div>

      <div className="field photo-field">
        <label htmlFor="photo">Recipe image</label>
        {photoPreview ? <img className="photo-preview" src={photoPreview} alt="" /> : null}
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        />
        {photoPreview ? (
          <button
            type="button"
            className="btn quiet"
            onClick={() => {
              setPhotoFile(null)
              setPhotoPath(null)
            }}
          >
            Remove image
          </button>
        ) : null}
      </div>

      <button type="button" className="btn secondary" onClick={() => setShowExtras((v) => !v)}>
        {showExtras ? 'Hide' : 'Add'} ingredients, steps & tags
      </button>

      {showExtras ? (
        <>
          <div className="field">
            <label htmlFor="ingredients">Ingredients (one per line)</label>
            <textarea
              id="ingredients"
              rows={5}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="1½ lb salmon&#10;2 heads broccoli"
            />
          </div>
          <div className="field">
            <label htmlFor="steps">Steps (one per line)</label>
            <textarea
              id="steps"
              rows={5}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />
          </div>
          <div className="btn-row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="time">Cook time (min)</label>
              <input id="time" inputMode="numeric" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="servings">Servings</label>
              <input id="servings" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
            </div>
          </div>
          <div className="label">Tags</div>
          <div className="chip-row">
            {COMMON_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${tags.includes(t) ? 'on' : ''}`}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      <p className="muted" style={{ fontStyle: 'italic', fontSize: 13 }}>
        Only the title is required.
      </p>
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save recipe'}
      </button>
    </form>
  )
}

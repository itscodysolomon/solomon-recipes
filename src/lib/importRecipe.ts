/** Best-effort recipe page parse when CORS allows, or from pasted HTML. */
export type ImportedRecipe = {
  title: string
  notes: string
  ingredients: string[]
  steps: string[]
  cook_time_minutes: number | null
  servings: number | null
  image: string | null
}

/**
 * Recipe sites rarely send CORS headers, so a direct browser fetch usually
 * fails. Fall back to public CORS proxies before giving up.
 */
function fetchCandidates(url: string): string[] {
  return [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ]
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  let html = ''
  for (const candidate of fetchCandidates(url)) {
    try {
      const res = await fetch(candidate, { mode: 'cors' })
      if (!res.ok) continue
      const text = await res.text()
      if (text.trim()) {
        html = text
        break
      }
    } catch {
      // try next candidate
    }
  }

  if (!html) {
    throw new Error(
      'Could not fetch that URL, even through a proxy. Paste the recipe text into Notes instead, or try another link.',
    )
  }
  return parseRecipeHtml(html, url)
}

export function parseRecipeHtml(html: string, sourceUrl?: string): ImportedRecipe {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const jsonLd = extractJsonLdRecipe(doc)
  if (jsonLd) {
    return {
      ...jsonLd,
      image: resolveImageUrl(jsonLd.image ?? extractMetaImage(doc), sourceUrl),
      notes: sourceUrl ? `Imported from ${sourceUrl}` : jsonLd.notes,
    }
  }

  const title =
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.trim() ||
    'Imported recipe'

  const ingredients = [
    ...doc.querySelectorAll(
      '[itemprop="recipeIngredient"], .wprm-recipe-ingredient, .ingredient, li[class*="ingredient"]',
    ),
  ]
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)

  const steps = [
    ...doc.querySelectorAll(
      '[itemprop="recipeInstructions"] li, .wprm-recipe-instruction, .instruction, .directions li',
    ),
  ]
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)

  return {
    title,
    notes: sourceUrl ? `Imported from ${sourceUrl}` : '',
    ingredients,
    steps,
    cook_time_minutes: null,
    servings: null,
    image: resolveImageUrl(extractMetaImage(doc), sourceUrl),
  }
}

function extractMetaImage(doc: Document): string | null {
  const meta =
    doc.querySelector('meta[property="og:image"]') ||
    doc.querySelector('meta[name="twitter:image"]')
  return meta?.getAttribute('content')?.trim() || null
}

/** JSON-LD image can be a string, array, or ImageObject. */
function jsonLdImage(image: unknown): string | null {
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    for (const entry of image) {
      const found = jsonLdImage(entry)
      if (found) return found
    }
    return null
  }
  if (image && typeof image === 'object' && 'url' in image) {
    return jsonLdImage((image as { url: unknown }).url)
  }
  return null
}

function resolveImageUrl(image: string | null, sourceUrl?: string): string | null {
  if (!image) return null
  try {
    return new URL(image, sourceUrl).toString()
  } catch {
    return null
  }
}

function extractJsonLdRecipe(doc: Document): ImportedRecipe | null {
  const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')]
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '')
      const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data]
      for (const node of nodes) {
        const type = node['@type']
        const isRecipe =
          type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
        if (!isRecipe) continue

        const ingredients: string[] = Array.isArray(node.recipeIngredient)
          ? node.recipeIngredient.map((i: unknown) => cleanText(String(i)))
          : []

        let steps: string[] = []
        const instructions = node.recipeInstructions
        if (typeof instructions === 'string') {
          steps = [instructions]
        } else if (Array.isArray(instructions)) {
          steps = instructions.map((s: unknown) => {
            if (typeof s === 'string') return s
            if (s && typeof s === 'object' && 'text' in s) {
              return String((s as { text: string }).text)
            }
            return ''
          }).filter(Boolean)
        }

        const servings = parseInt(String(node.recipeYield ?? ''), 10)
        const minutes = parseDurationMinutes(node.totalTime || node.cookTime)

        return {
          title: cleanText(String(node.name || 'Imported recipe')),
          notes: typeof node.description === 'string' ? cleanText(node.description) : '',
          ingredients,
          steps: steps.map(cleanText).filter(Boolean),
          cook_time_minutes: minutes,
          servings: Number.isFinite(servings) ? servings : null,
          image: jsonLdImage(node.image),
        }
      }
    } catch {
      // ignore bad JSON-LD
    }
  }
  return null
}

/**
 * JSON-LD strings often carry HTML entities (&#32;, &amp;, …) and stray
 * markup. Decode them via the browser's HTML parser and tidy whitespace.
 */
function cleanText(raw: string): string {
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseDurationMinutes(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!match) return null
  const hours = Number(match[1] || 0)
  const mins = Number(match[2] || 0)
  const total = hours * 60 + mins
  return total > 0 ? total : null
}

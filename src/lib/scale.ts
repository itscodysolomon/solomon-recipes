import type { Ingredient } from './types'

/** Best-effort scale of leading quantity in an ingredient line. */
export function scaleIngredientText(
  text: string,
  fromServings: number,
  toServings: number,
): string {
  if (!fromServings || fromServings === toServings) return text
  const factor = toServings / fromServings
  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)(.*)$/)
  if (!match) return text
  const qty = parseMixedNumber(match[1])
  if (qty == null) return text
  const scaled = qty * factor
  return `${formatQuantity(scaled)}${match[2]}`
}

export function scaleIngredients(
  ingredients: Ingredient[],
  fromServings: number,
  toServings: number,
): Ingredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    text: scaleIngredientText(ing.text, fromServings, toServings),
    quantity:
      ing.quantity != null && fromServings
        ? (ing.quantity * toServings) / fromServings
        : ing.quantity,
  }))
}

function parseMixedNumber(raw: string): number | null {
  const s = raw.trim()
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  }
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function formatQuantity(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  const eighths = Math.round(frac * 8) / 8
  if (eighths === 0) return String(whole)
  const map: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.75: '3/4',
    0.875: '7/8',
  }
  const label = map[eighths]
  if (!label) return String(rounded)
  return whole > 0 ? `${whole} ${label}` : label
}

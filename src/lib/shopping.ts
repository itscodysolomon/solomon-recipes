const SECTION_KEYWORDS: Record<string, string[]> = {
  Produce: [
    'broccoli',
    'onion',
    'garlic',
    'lemon',
    'lime',
    'tomato',
    'bell pepper',
    'jalapeño',
    'jalapeno',
    'poblano',
    'serrano',
    'spinach',
    'lettuce',
    'carrot',
    'potato',
    'herb',
    'cilantro',
    'parsley',
    'avocado',
    'cucumber',
    'zucchini',
    'mushroom',
    'celery',
    'ginger',
    'apple',
    'berry',
    'banana',
    'salad',
  ],
  'Meat & fish': [
    'chicken',
    'beef',
    'pork',
    'salmon',
    'fish',
    'shrimp',
    'turkey',
    'bacon',
    'sausage',
    'brat',
    'steak',
    'thigh',
    'ground beef',
    'ground turkey',
    'ground pork',
    'ground chicken',
    'ground lamb',
  ],
  Dairy: ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'egg'],
  Beverages: [
    'coffee',
    'tea',
    'juice',
    'wine',
    'beer',
    'soda',
    'sparkling water',
    'seltzer',
    'kombucha',
  ],
  Condiments: [
    'ketchup',
    'mayo',
    'mayonnaise',
    'mustard',
    'hot sauce',
    'sriracha',
    'salsa',
    'soy sauce',
    'bbq sauce',
    'barbecue sauce',
    'dressing',
    'tahini',
    'relish',
    'pickle',
    'jam',
    'jelly',
  ],
  Staples: [
    'oil',
    'salt',
    'pepper',
    'flour',
    'sugar',
    'rice',
    'pasta',
    'vinegar',
    'soy',
    'spice',
    'sumac',
    'paprika',
    'cumin',
    'stock',
    'broth',
    'honey',
  ],
}

export function guessSection(name: string): string {
  const lower = name.toLowerCase()
  // Dried/powdered forms are pantry spices even when they contain a produce
  // word (garlic powder, onion flakes, dried basil).
  if (/\b(powder|dried|flakes|seasoning)\b/.test(lower)) return 'Staples'
  for (const [section, words] of Object.entries(SECTION_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return section
  }
  return 'Other'
}

/** Strip leading qty/units for merge key. */
export function normalizeIngredientKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/^[\d./\s½¼¾⅓⅔]+/, '')
    .replace(
      /\b(cups?|tbsps?|tbsp|tsps?|tsp|oz|ounces?|lbs?|pounds?|g|grams?|ml|cloves?|heads?|large|small|medium)\b/g,
      '',
    )
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type MergedItem = {
  name: string
  section: string
  sourceNote: string
  count: number
}

export function mergeIngredientLines(lines: string[]): MergedItem[] {
  const map = new Map<string, { sample: string; count: number; sources: string[] }>()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const key = normalizeIngredientKey(trimmed) || trimmed.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.sources.push(trimmed)
    } else {
      map.set(key, { sample: trimmed, count: 1, sources: [trimmed] })
    }
  }

  return [...map.values()].map((v) => ({
    name: v.sample,
    section: guessSection(v.sample),
    sourceNote: v.count > 1 ? `${v.count} recipes` : '',
    count: v.count,
  }))
}

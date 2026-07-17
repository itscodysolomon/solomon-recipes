export type Ingredient = {
  text: string
  quantity?: number | null
  unit?: string | null
}

export type Recipe = {
  id: string
  household_id: string
  title: string
  notes: string
  ingredients: Ingredient[]
  steps: string[]
  tags: string[]
  cook_time_minutes: number | null
  servings: number | null
  photo_path: string | null
  favorite: boolean
  times_cooked: number
  last_cooked_at: string | null
  created_at: string
  updated_at: string
}

export type PlanEntry = {
  id: string
  household_id: string
  date: string
  recipe_id: string | null
  label: string | null
  created_at: string
  recipe?: Recipe | null
}

export type ShoppingItem = {
  id: string
  household_id: string
  name: string
  section: string
  checked: boolean
  source_note: string
  created_at: string
}

export type Profile = {
  id: string
  display_name: string
  household_id: string | null
}

export type RecipeInput = {
  title: string
  notes?: string
  ingredients?: Ingredient[]
  steps?: string[]
  tags?: string[]
  cook_time_minutes?: number | null
  servings?: number | null
  photo_path?: string | null
  favorite?: boolean
}

export const COMMON_TAGS = [
  'Dairy-free',
  'Paleo',
  'Healthy',
  'Weeknight',
  'Grill',
  'Comfort',
  'Brunch',
] as const

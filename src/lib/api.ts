import { isSupabaseConfigured, requireSupabase } from './supabase'
import { guessSection } from './shopping'
import type {
  Ingredient,
  PlanEntry,
  Profile,
  Recipe,
  RecipeInput,
  ShoppingItem,
} from './types'

const LOCAL_KEY = 'solomons-cook-v1'

type LocalState = {
  householdId: string
  profile: Profile
  recipes: Recipe[]
  plan: PlanEntry[]
  shopping: ShoppingItem[]
}

function uid(): string {
  return crypto.randomUUID()
}

function emptyLocal(): LocalState {
  const householdId = uid()
  return {
    householdId,
    profile: {
      id: 'local-user',
      display_name: 'Cook',
      household_id: householdId,
    },
    recipes: [],
    plan: [],
    shopping: [],
  }
}

function readLocal(): LocalState {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) {
      const state = emptyLocal()
      writeLocal(state)
      return state
    }
    return JSON.parse(raw) as LocalState
  } catch {
    const state = emptyLocal()
    writeLocal(state)
    return state
  }
}

function writeLocal(state: LocalState) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state))
}

function normalizeRecipe(row: Recipe): Recipe {
  return {
    ...row,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes ?? '',
  }
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return readLocal().profile

  const sb = requireSupabase()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null

  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, household_id')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listRecipes(): Promise<Recipe[]> {
  if (!isSupabaseConfigured) {
    return readLocal().recipes.map(normalizeRecipe)
  }

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((r) => normalizeRecipe(r as Recipe))
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  if (!isSupabaseConfigured) {
    return readLocal().recipes.find((r) => r.id === id) ?? null
  }

  const sb = requireSupabase()
  const { data, error } = await sb.from('recipes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? normalizeRecipe(data as Recipe) : null
}

export async function createRecipe(input: RecipeInput): Promise<Recipe> {
  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')

  const payload = {
    household_id: profile.household_id,
    title: input.title.trim(),
    notes: input.notes ?? '',
    ingredients: input.ingredients ?? [],
    steps: input.steps ?? [],
    tags: input.tags ?? [],
    cook_time_minutes: input.cook_time_minutes ?? null,
    servings: input.servings ?? 4,
    photo_path: input.photo_path ?? null,
    favorite: input.favorite ?? false,
  }

  if (!isSupabaseConfigured) {
    const state = readLocal()
    const now = new Date().toISOString()
    const recipe: Recipe = {
      id: uid(),
      ...payload,
      times_cooked: 0,
      last_cooked_at: null,
      created_at: now,
      updated_at: now,
    }
    state.recipes.unshift(recipe)
    writeLocal(state)
    return recipe
  }

  const sb = requireSupabase()
  const { data, error } = await sb.from('recipes').insert(payload).select('*').single()
  if (error) throw error
  return normalizeRecipe(data as Recipe)
}

export async function updateRecipe(
  id: string,
  patch: Partial<RecipeInput> & {
    times_cooked?: number
    last_cooked_at?: string | null
  },
): Promise<Recipe> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    const idx = state.recipes.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Recipe not found')
    const next = {
      ...state.recipes[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    } as Recipe
    state.recipes[idx] = next
    writeLocal(state)
    return next
  }

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('recipes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return normalizeRecipe(data as Recipe)
}

export async function deleteRecipe(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    state.recipes = state.recipes.filter((r) => r.id !== id)
    state.plan = state.plan.map((p) =>
      p.recipe_id === id ? { ...p, recipe_id: null } : p,
    )
    writeLocal(state)
    return
  }

  const sb = requireSupabase()
  const { error } = await sb.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export async function listPlanEntries(from: string, to: string): Promise<PlanEntry[]> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    return state.plan
      .filter((p) => p.date >= from && p.date <= to)
      .map((p) => ({
        ...p,
        recipe: state.recipes.find((r) => r.id === p.recipe_id) ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('plan_entries')
    .select('*, recipe:recipes(*)')
    .gte('date', from)
    .lte('date', to)
    .order('date')

  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as PlanEntry & { recipe?: Recipe | Recipe[] | null }
    const recipe = Array.isArray(r.recipe) ? r.recipe[0] : r.recipe
    return {
      ...r,
      recipe: recipe ? normalizeRecipe(recipe) : null,
    }
  })
}

export async function upsertPlanEntry(input: {
  date: string
  recipe_id?: string | null
  label?: string | null
}): Promise<PlanEntry> {
  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')

  if (!isSupabaseConfigured) {
    const state = readLocal()
    const existing = state.plan.find((p) => p.date === input.date)
    if (existing) {
      existing.recipe_id = input.recipe_id ?? null
      existing.label = input.label ?? null
      writeLocal(state)
      return {
        ...existing,
        recipe: state.recipes.find((r) => r.id === existing.recipe_id) ?? null,
      }
    }
    const entry: PlanEntry = {
      id: uid(),
      household_id: profile.household_id,
      date: input.date,
      recipe_id: input.recipe_id ?? null,
      label: input.label ?? null,
      created_at: new Date().toISOString(),
    }
    state.plan.push(entry)
    writeLocal(state)
    return {
      ...entry,
      recipe: state.recipes.find((r) => r.id === entry.recipe_id) ?? null,
    }
  }

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('plan_entries')
    .upsert(
      {
        household_id: profile.household_id,
        date: input.date,
        recipe_id: input.recipe_id ?? null,
        label: input.label ?? null,
      },
      { onConflict: 'household_id,date' },
    )
    .select('*, recipe:recipes(*)')
    .single()

  if (error) throw error
  const r = data as PlanEntry & { recipe?: Recipe | null }
  return {
    ...r,
    recipe: r.recipe ? normalizeRecipe(r.recipe) : null,
  }
}

export async function clearPlanEntry(date: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    state.plan = state.plan.filter((p) => p.date !== date)
    writeLocal(state)
    return
  }

  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')
  const sb = requireSupabase()
  const { error } = await sb
    .from('plan_entries')
    .delete()
    .eq('household_id', profile.household_id)
    .eq('date', date)
  if (error) throw error
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  if (!isSupabaseConfigured) return readLocal().shopping

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('shopping_items')
    .select('*')
    .order('section')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function replaceShoppingList(
  items: Omit<ShoppingItem, 'id' | 'household_id' | 'created_at'>[],
): Promise<ShoppingItem[]> {
  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')

  if (!isSupabaseConfigured) {
    const state = readLocal()
    const now = new Date().toISOString()
    state.shopping = items.map((item) => ({
      id: uid(),
      household_id: profile.household_id!,
      created_at: now,
      ...item,
    }))
    writeLocal(state)
    return state.shopping
  }

  const sb = requireSupabase()
  await sb.from('shopping_items').delete().eq('household_id', profile.household_id)
  if (items.length === 0) return []

  const { data, error } = await sb
    .from('shopping_items')
    .insert(
      items.map((item) => ({
        household_id: profile.household_id,
        ...item,
      })),
    )
    .select('*')
  if (error) throw error
  return data ?? []
}

export async function updateShoppingItem(
  id: string,
  patch: Partial<Pick<ShoppingItem, 'checked' | 'name' | 'section'>>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    const item = state.shopping.find((s) => s.id === id)
    if (item) Object.assign(item, patch)
    writeLocal(state)
    return
  }

  const sb = requireSupabase()
  const { error } = await sb.from('shopping_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function addShoppingItem(name: string): Promise<ShoppingItem> {
  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')

  const payload = {
    household_id: profile.household_id,
    name: name.trim(),
    section: guessSection(name),
    checked: false,
    source_note: '',
  }

  if (!isSupabaseConfigured) {
    const state = readLocal()
    const item: ShoppingItem = {
      id: uid(),
      created_at: new Date().toISOString(),
      ...payload,
    }
    state.shopping.push(item)
    writeLocal(state)
    return item
  }

  const sb = requireSupabase()
  const { data, error } = await sb
    .from('shopping_items')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as ShoppingItem
}

export async function deleteShoppingItem(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readLocal()
    state.shopping = state.shopping.filter((s) => s.id !== id)
    writeLocal(state)
    return
  }

  const sb = requireSupabase()
  const { error } = await sb.from('shopping_items').delete().eq('id', id)
  if (error) throw error
}

export function ingredientsToLines(ingredients: Ingredient[]): string[] {
  return ingredients.map((i) => i.text).filter(Boolean)
}

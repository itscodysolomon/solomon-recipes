import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  addShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  updateShoppingItem,
} from '../lib/api'
import type { ShoppingItem } from '../lib/types'

const SECTION_ORDER = ['Produce', 'Meat & fish', 'Dairy', 'Beverages', 'Staples', 'Other']

export function ListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      setItems(await listShoppingItems())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const list = map.get(item.section) ?? []
      list.push(item)
      map.set(item.section, list)
    }
    const sections = [...map.keys()].sort(
      (a, b) => SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b) || a.localeCompare(b),
    )
    return sections.map((section) => ({ section, items: map.get(section)! }))
  }, [items])

  async function toggle(item: ShoppingItem) {
    await updateShoppingItem(item.id, { checked: !item.checked })
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    )
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    const item = await addShoppingItem(draft.trim())
    setItems((prev) => [...prev, item])
    setDraft('')
  }

  async function remove(id: string) {
    await deleteShoppingItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="stack" style={{ paddingTop: 16 }}>
      <h1 className="page-title">Shopping list</h1>
      <p className="meta">
        {items.length === 0
          ? 'Generate one from the Plan tab, or add items below.'
          : `${items.filter((i) => !i.checked).length} remaining · ${items.length} total`}
      </p>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {grouped.map(({ section, items: sectionItems }) => (
        <div key={section} className="stack">
          <div className="label">{section}</div>
          <div className="check-list">
            {sectionItems.map((item) => (
              <div
                key={item.id}
                className={`check-row ${item.checked ? 'done' : ''}`}
                style={{
                  background: '#fff',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => void toggle(item)}
                />
                <span style={{ flex: 1 }}>{item.name}</span>
                {item.source_note ? (
                  <span className="meta" style={{ fontSize: 11 }}>
                    {item.source_note}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="meta"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => void remove(item.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <form className="stack" onSubmit={onAdd}>
        <div className="field">
          <label htmlFor="add-item">Add item</label>
          <input
            id="add-item"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Coffee, paper towels…"
          />
        </div>
        <button type="submit" className="btn secondary" disabled={!draft.trim()}>
          Add to list
        </button>
      </form>
    </div>
  )
}

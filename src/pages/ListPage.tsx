import { useEffect, useState, type FormEvent } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  addShoppingItem,
  clearShoppingItems,
  deleteShoppingItem,
  listShoppingItems,
  reorderShoppingItems,
  updateShoppingItem,
} from '../lib/api'
import type { ShoppingItem } from '../lib/types'

function SortableShoppingItem({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      className={`shopping-row check-row ${item.checked ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Move ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <span />
        <span />
        <span />
      </button>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => onToggle(item)}
      />
      <span className="shopping-name">{item.name}</span>
      {item.source_note ? <span className="shopping-source">{item.source_note}</span> : null}
      <button
        type="button"
        className="remove-item"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.name}`}
      >
        ×
      </button>
    </div>
  )
}

export function ListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const previous = items
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)
    try {
      await reorderShoppingItems(reordered.map((item) => item.id))
      setError('')
    } catch (err) {
      setItems(previous)
      setError(err instanceof Error ? err.message : 'Could not save the new order')
    }
  }

  async function clearAll() {
    if (!confirm(`Clear all ${items.length} items from the shopping list?`)) return
    setClearing(true)
    try {
      await clearShoppingItems()
      setItems([])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear the list')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="stack" style={{ paddingTop: 16 }}>
      <div className="shopping-title-row">
        <h1 className="page-title">Shopping list</h1>
        {items.length > 0 ? (
          <button
            type="button"
            className="clear-list"
            disabled={clearing}
            onClick={() => void clearAll()}
          >
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        ) : null}
      </div>
      <p className="meta">
        {items.length === 0
          ? 'Add items below as you think of them.'
          : `${items.filter((i) => !i.checked).length} remaining · ${items.length} total`}
      </p>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Loading…</p> : null}

      {items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="shopping-list">
              {items.map((item) => (
                <SortableShoppingItem
                  key={item.id}
                  item={item}
                  onToggle={(next) => void toggle(next)}
                  onRemove={(id) => void remove(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

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

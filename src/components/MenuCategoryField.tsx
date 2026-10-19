import { useMemo, useState } from 'react'
import {
  Circle,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Hand,
  Package,
  Pizza,
  Plus,
  Sandwich,
  Soup,
  Sparkles,
  X,
} from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { Btn, Select, TextInput } from './ui'

export const CATEGORY_ICON_CHOICES = [
  { value: 'cafe', label: 'Cafe' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'momo', label: 'Momo' },
  { value: 'burger', label: 'Burger' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'cold_drinks', label: 'Cold Drinks' },
  { value: 'patties', label: 'Patties' },
  { value: 'chalk', label: 'Chalk' },
  { value: 'gloves', label: 'Gloves' },
  { value: 'cue', label: 'Snooker cue' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
] as const

export type MenuCategoryIcon = (typeof CATEGORY_ICON_CHOICES)[number]['value']

export function defaultCategoryIcon(category: string): MenuCategoryIcon {
  const normalized = category.trim().toLowerCase()
  if (normalized.includes('momo')) return 'momo'
  if (normalized.includes('burger')) return 'burger'
  if (normalized.includes('pizza')) return 'pizza'
  if (normalized.includes('cold drink')) return 'cold_drinks'
  if (normalized.includes('patt')) return 'patties'
  if (['cafe', 'café', 'coffee', 'tea'].includes(normalized)) return 'cafe'
  if (['drink', 'drinks', 'beverage', 'beverages', 'cold drinks'].includes(normalized)) return 'drinks'
  if (['snack', 'snacks', 'food'].includes(normalized)) return 'snacks'
  if (normalized.includes('chalk')) return 'chalk'
  if (normalized.includes('glove')) return 'gloves'
  if (normalized.includes('cue') || normalized.includes('queue')) return 'cue'
  if (normalized.includes('accessor')) return 'accessories'
  return 'other'
}

export function CategoryIcon({ icon, size = 14 }: { icon?: string | null; size?: number }) {
  const iconId = CATEGORY_ICON_CHOICES.some((choice) => choice.value === icon)
    ? icon as MenuCategoryIcon
    : 'other'
  const common = { size, strokeWidth: 1.9, 'aria-hidden': true as const }

  switch (iconId) {
    case 'cafe': return <Coffee {...common} />
    case 'drinks': return <CupIcon size={size} />
    case 'snacks': return <Cookie {...common} />
    case 'momo': return <Soup {...common} />
    case 'burger': return <Sandwich {...common} />
    case 'pizza': return <Pizza {...common} />
    case 'cold_drinks': return <CupSoda {...common} />
    case 'patties': return <Croissant {...common} />
    case 'chalk': return <Circle {...common} />
    case 'gloves': return <Hand {...common} />
    case 'cue': return <CueIcon size={size} />
    case 'accessories': return <Package {...common} />
    default: return <Sparkles {...common} />
  }
}

function CupIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h12v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8Z" />
      <path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 4v2M12 3v3M16 4v2" />
    </svg>
  )
}

function CueIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 19 13-13M4 20l2-1M18 6l2-2" />
      <circle cx="4" cy="20" r="1" />
    </svg>
  )
}

export function MenuCategoryField({
  category,
  icon,
  onCategoryChange,
  onIconChange,
}: {
  category: string
  icon: MenuCategoryIcon
  onCategoryChange: (category: string) => void
  onIconChange: (icon: MenuCategoryIcon) => void
}) {
  const { data } = useClub()
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const items = data?.menuItems ?? []
  const categories = useMemo(() => {
    const found = new Map<string, { name: string; icon: MenuCategoryIcon }>()
    CATEGORY_ICON_CHOICES.forEach(({ label, value }) => {
      found.set(label.toLowerCase(), { name: label, icon: value })
    })
    for (const item of items) {
      const name = item.category.trim()
      const key = name.toLowerCase()
      if (name && !found.has(key)) {
        found.set(key, { name, icon: item.categoryIcon ?? defaultCategoryIcon(name) })
      }
    }
    const currentName = category.trim()
    if (currentName && !found.has(currentName.toLowerCase())) {
      found.set(currentName.toLowerCase(), { name: currentName, icon })
    }
    return [...found.values()]
  }, [items, category, icon])

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name) return
    onCategoryChange(name)
    onIconChange(defaultCategoryIcon(name))
    setNewCategory('')
    setAdding(false)
  }

  return (
    <div className="menu-category-field">
      {adding ? (
        <div className="menu-category-input-row">
          <TextInput
            autoFocus
            maxLength={60}
            value={newCategory}
            placeholder="New category name"
            aria-label="New category name"
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addCategory() }}
          />
          <Btn size="sm" variant="green" disabled={!newCategory.trim()} onClick={addCategory}>Add</Btn>
          <button
            type="button"
            className="btn-icon"
            aria-label="Cancel adding category"
            title="Cancel"
            onClick={() => { setAdding(false); setNewCategory('') }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="menu-category-input-row">
          <Select
            value={category}
            aria-label="Category"
            onChange={(event) => {
              const selected = categories.find((entry) => entry.name === event.target.value)
              onCategoryChange(event.target.value)
              if (selected) onIconChange(selected.icon)
            }}
          >
            {categories.map((entry) => (
              <option key={entry.name} value={entry.name}>{entry.name}</option>
            ))}
          </Select>
          <Btn size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={12} /> Add category
          </Btn>
        </div>
      )}
      <div className="category-icon-picker" role="group" aria-label="Category icon">
        <span className="category-icon-label">Icon</span>
        <div className="category-icon-options">
          {CATEGORY_ICON_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`category-icon-option${icon === choice.value ? ' active' : ''}`}
              aria-label={`${choice.label} icon`}
              aria-pressed={icon === choice.value}
              title={choice.label}
              onClick={() => onIconChange(choice.value)}
            >
              <CategoryIcon icon={choice.value} size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

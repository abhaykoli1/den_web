// Stock — port of den_app `lib/src/screens/items_screen.dart` → StockScreen.
// The Records hub's inventory tab: item master (photo, price, cost, reorder
// level), restock (auto-expense), low-stock triage and stock valuation.
// Counter selling stays on /items, exactly like the app's Counter tab.
import { useMemo, useRef, useState } from 'react'
import {
  ImageOff,
  ImagePlus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useClub } from '../context/ClubContext'
import { formatCurrency, parseNum, titleCase } from '../lib/format'
import {
  Badge,
  Btn,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  Modal,
  Seg,
  StatCard,
  TextInput,
} from './ui'
import InsightsCard from './InsightsCard'
import type { MenuItem } from '../types'

type Filter = 'all' | 'low' | 'out'

/** Shrink a picked photo in-browser — the API body must stay small. */
function compress(file: File, max: number, onReady: (dataUrl: string) => void) {
  if (!file.type.startsWith('image/')) return
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    onReady(canvas.toDataURL('image/png'))
    URL.revokeObjectURL(img.src)
  }
  img.onerror = () => URL.revokeObjectURL(img.src)
  img.src = URL.createObjectURL(file)
}

function StockItemModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: MenuItem | null }) {
  const { mutate } = useClub()
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? 'Cafe')
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [costPrice, setCostPrice] = useState(String(item?.costPrice ?? '0'))
  const [stockQty, setStockQty] = useState(String(item?.stockQty ?? '0'))
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorderLevel ?? '5'))
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [image, setImage] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const preview = image !== undefined ? image : item?.image ?? null

  const save = async () => {
    if (!name.trim() || parseNum(price) <= 0) return
    setBusy(true)
    const body: Record<string, unknown> = {
      name: name.trim(),
      category: category.trim() || 'Cafe',
      price: parseNum(price),
      costPrice: parseNum(costPrice),
      reorderLevel: Math.max(0, Math.floor(parseNum(reorderLevel, 5))),
      ...(item ? (unit.trim() ? { unit: unit.trim() } : {}) : { unit: unit.trim() || 'pc' }),
      active,
    }
    if (image !== undefined) body.image = image ?? ''
    if (!item) body.stockQty = Math.max(0, Math.floor(parseNum(stockQty)))
    const r = item
      ? await mutate(`menu-items/${item.id}`, { method: 'PATCH', body, toast: 'Item updated' })
      : await mutate('menu-items', { body, toast: 'Item added' })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Edit · ${item.name}` : 'Add item'}
      width={430}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={!name.trim() || parseNum(price) <= 0} onClick={save}>
            {item ? 'Save item' : 'Add item'}
          </Btn>
        </>
      }
    >
      <div className="logo-row" style={{ marginBottom: 10 }}>
        <div className="logo-preview" style={{ width: 54, height: 54 }}>
          {preview ? <img src={preview} alt={name || 'Item'} /> : <span className="logo-empty"><ImageOff size={16} /></span>}
        </div>
        <div className="stack-xs">
          <input
            ref={imgRef}
            type="file"
            accept="image/*"
            className="hidden-file"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) compress(f, 320, setImage)
            }}
          />
          <Btn size="sm" variant="outline" onClick={() => imgRef.current?.click()}>
            <ImagePlus size={12} /> {preview ? 'Change photo' : 'Add photo'}
          </Btn>
          {preview && (
            <Btn size="sm" variant="ghost" className="danger-text" onClick={() => setImage(null)}>
              <X size={12} /> Remove photo
            </Btn>
          )}
        </div>
      </div>
      <div className="form-grid two">
        <Field label="Item name *"><TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Category"><TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cafe" /></Field>
        <Field label="Sell price ₹ *"><TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="40" /></Field>
        <Field label="Cost ₹/piece"><TextInput inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="15" /></Field>
        <Field label="Unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pc / cup / plate" /></Field>
        <Field label="Reorder level" hint="is pe / neeche low-stock alert"><TextInput inputMode="numeric" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} /></Field>
        {!item && (
          <Field label="Opening stock" hint="baad me Restock se badhao">
            <TextInput inputMode="numeric" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
          </Field>
        )}
      </div>
      <label className="check-row">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Active (counter chips pe dikhega)</span>
      </label>
    </Modal>
  )
}

function RestockModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: MenuItem }) {
  const { mutate } = useClub()
  const [qty, setQty] = useState('10')
  const [unitCost, setUnitCost] = useState(String(item.costPrice || ''))
  const [busy, setBusy] = useState(false)
  const qtyNum = Math.max(0, Math.floor(parseNum(qty)))
  const spend = qtyNum * parseNum(unitCost)

  const submit = async () => {
    if (qtyNum <= 0) return
    setBusy(true)
    const r = await mutate(`menu-items/${item.id}/restock`, {
      body: { qty: qtyNum, unitCost: parseNum(unitCost) },
      toast: `Restocked · ${item.name} +${qtyNum}`,
    })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Restock · ${item.name}`}
      width={360}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={qtyNum <= 0} onClick={submit}>
            Add stock
          </Btn>
        </>
      }
    >
      <div className="form-grid two">
        <Field label="Quantity"><TextInput inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Cost ₹/piece"><TextInput inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></Field>
      </div>
      <p className="muted small">
        Current stock: <b>{item.stockQty} pcs</b> · purchase <b>{formatCurrency(spend)}</b> auto-records as a stock expense
        (den_app jaisa — double entry nahi).
      </p>
    </Modal>
  )
}

export default function StockScreen() {
  const { data, mutate } = useClub()
  const menuItems = useMemo(() => data?.menuItems ?? [], [data])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [itemModal, setItemModal] = useState<{ item: MenuItem | null } | null>(null)
  const [restock, setRestock] = useState<MenuItem | null>(null)
  const [confirmDel, setConfirmDel] = useState<MenuItem | null>(null)
  const [delBusy, setDelBusy] = useState(false)

  const low = menuItems.filter((m) => m.active !== false && m.stockQty > 0 && m.stockQty <= (m.reorderLevel ?? 5))
  const out = menuItems.filter((m) => m.active !== false && m.stockQty <= 0)
  const stockValue = menuItems.reduce((s, m) => s + Math.max(0, m.stockQty) * (m.costPrice || 0), 0)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return menuItems.filter((m) => {
      if (filter === 'low' && !(m.stockQty > 0 && m.stockQty <= (m.reorderLevel ?? 5))) return false
      if (filter === 'out' && m.stockQty > 0) return false
      if (!q) return true
      return `${m.name} ${m.category}`.toLowerCase().includes(q)
    })
  }, [menuItems, query, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    visible.forEach((m) => {
      const key = m.category || 'Cafe'
      map.set(key, [...(map.get(key) ?? []), m])
    })
    return [...map.entries()]
  }, [visible])

  const doDelete = async () => {
    if (!confirmDel) return
    setDelBusy(true)
    const r = await mutate(`menu-items/${confirmDel.id}`, { method: 'DELETE', toast: `Deleted · ${confirmDel.name}` })
    setDelBusy(false)
    if (r) setConfirmDel(null)
  }

  return (
    <div className="stack">
      <div className="grid-stats four">
        <StatCard label="Items" value={String(menuItems.length)} tone="blue" sub="in the menu" />
        <StatCard label="Low stock" value={String(low.length)} tone="gold" sub="at / below reorder" />
        <StatCard label="Out of stock" value={String(out.length)} tone="red" sub="counter pe locked" />
        <StatCard label="Stock value" value={formatCurrency(stockValue)} tone="green" sub="at cost price" />
      </div>

      <InsightsCard scopes={['stock']} compact max={3} title="Stock insights" />

      <div className="row wrap" style={{ alignItems: 'center' }}>
        <span className="search-box">
          <Search size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item or category" aria-label="Search stock" />
        </span>
        <Seg<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Stock filter"
          options={[
            { value: 'all', label: 'All' },
            { value: 'low', label: `Low ${low.length ? `· ${low.length}` : ''}`.trim() },
            { value: 'out', label: `Out ${out.length ? `· ${out.length}` : ''}`.trim() },
          ]}
        />
        <span className="spacer" />
        <Btn variant="green" onClick={() => setItemModal({ item: null })}>
          <Plus size={13} /> Add item
        </Btn>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <EmptyState title="Kuch nahi mila" hint="Add tea, cold drinks, snacks… ya filter badlo." />
        </Card>
      ) : (
        grouped.map(([cat, items]) => (
          <Card key={cat} className="menu-group">
            <div className="menu-cat">{titleCase(cat)}</div>
            <div className="menu-list">
              {items.map((m) => (
                <div key={m.id} className={`menu-row${m.active ? '' : ' inactive'}`}>
                  {m.image ? (
                    <img className="item-thumb" src={m.image} alt={m.name} />
                  ) : (
                    <span className="item-thumb item-thumb-empty"><ImageOff size={13} /></span>
                  )}
                  <span className="menu-name">
                    {m.name}
                    {m.unit && <span className="muted small"> · {m.unit}</span>}
                    {!m.active && <Badge kind="muted">inactive</Badge>}
                    <span
                      className={`stock-pill${m.stockQty <= 0 ? ' zero' : m.stockQty <= (m.reorderLevel ?? 5) ? ' low' : ''}`}
                      title={`Alert at ≤${m.reorderLevel ?? 5}`}
                    >
                      {m.stockQty} pcs
                    </span>
                  </span>
                  <span className="menu-price">
                    <span className="money-gold">{formatCurrency(m.price)}</span>
                    <span className="muted small">cost {formatCurrency(m.costPrice)}</span>
                  </span>
                  <button className="btn-icon" title="Restock (adds expense)" aria-label={`Restock ${m.name}`} onClick={() => setRestock(m)}>
                    <PackagePlus size={12} />
                  </button>
                  <button className="btn-icon" title="Edit" aria-label={`Edit ${m.name}`} onClick={() => setItemModal({ item: m })}>
                    <Pencil size={12} />
                  </button>
                  <button className="btn-icon danger" title="Delete" aria-label={`Delete ${m.name}`} onClick={() => setConfirmDel(m)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      {itemModal && <StockItemModal open onClose={() => setItemModal(null)} item={itemModal.item} />}
      {restock && <RestockModal open onClose={() => setRestock(null)} item={restock} />}
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => void doDelete()}
        busy={delBusy}
        title="Delete item?"
        message={confirmDel ? `${confirmDel.name} menu se hat jayega. Purane bills waise hi rahenge.` : ''}
      />
    </div>
  )
}

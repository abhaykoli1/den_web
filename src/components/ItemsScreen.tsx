import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloudOff, ImagePlus, ImageOff, PackagePlus, Pencil, Plus, Receipt, RefreshCw, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClub } from '../context/ClubContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency, parseNum, titleCase } from '../lib/format'
import {
  Badge,
  Btn,
  Card,
  ConfirmModal,
  EmptyState,
  Field,
  Modal,
  Select,
  TextInput,
} from './ui'
import InsightsCard from './InsightsCard'
import {
  enqueueBill,
  isOfflineError,
  pendingCount,
  QUEUE_EVENT,
  syncQueue,
} from '../lib/offlineQueue'
import { api, ApiError } from '../lib/api'
import ReceiptModal, { itemBillReceipt, type ReceiptData } from './ReceiptModal'
import type { ItemBill, MenuItem, PaymentMode } from '../types'

// ================================================================
// BACKEND-FIX SUMMARY (is file me 7 spots — pehle page blank tha):
//  1. item-bills POST response = { bill, message } — `r.bill` unwrap
//     karna tha (ReceiptModal ko poora {bill,message} mil raha tha
//     → items undefined → crash → BLANK PAGE) ← asli blankreason
//  2. items payload: `menuItemId` (na ki itemId) — backend model ka field
//     (ab backend alias bhi samajh leta hai, phir bhi sahi naam bhejo)
//  3. `mode` (na ki paymentMode) — paymentMode/paidAmount/notes backend
//     silently ignore karta tha (extra="ignore") — bill hamesha CASH full
//     ban jata tha chahe tumne due chuna ho
//  4. wallet rule: backend FULL cover maangta hai (partial → 400) —
//     insufficient balance pe create block + hint
//  5. due rule: poora amount member ke due me jata hai (partial paid nahi;
//     baad me Due Desk se collect ya mark-paid)
//  6. mixed mode: payments[] [{mode,amount}] ka sum EXACTLY total hona
//     chahiye — chhota split editor add kiya, mismatch pe block
//  7. create item: unit null bhejne se backend 400 deta hai → default 'pc'
// ================================================================

// ----------------------------------------------------------- item modal

function ItemModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: MenuItem | null }) {
  const { mutate } = useClub()
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? 'Cafe')
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [costPrice, setCostPrice] = useState(String(item?.costPrice ?? '0'))
  const [stockQty, setStockQty] = useState(String(item?.stockQty ?? '0'))
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorderLevel ?? '5'))
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  // den_app items_screen.dart → _productImagePicker: product photo per item.
  const [image, setImage] = useState<string | null | undefined>(undefined)
  const imgRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const preview = image !== undefined ? image : item?.image ?? null

  const pickImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const img = new Image()
    img.onload = () => {
      const MAX = 320
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setImage(canvas.toDataURL('image/png'))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => URL.revokeObjectURL(img.src)
    img.src = URL.createObjectURL(file)
  }

  const save = async () => {
    if (!name.trim()) return
    // BACKEND-FIX 6b: price > 0 chahiye (MenuItemIn gt=0) — warna backend 400
    if (parseNum(price) <= 0) return
    setBusy(true)
    const body: Record<string, unknown> = {
      name: name.trim(),
      category: category.trim() || 'Cafe',
      price: parseNum(price),
      costPrice: parseNum(costPrice),
      reorderLevel: Math.max(0, Math.floor(parseNum(reorderLevel, 5))),
      // BACKEND-FIX 7: create pe unit null mat bhejo (str required) — default 'pc';
      // PATCH pe blank ko omit karo (Optional filter)
      ...(item
        ? unit.trim() ? { unit: unit.trim() } : {}
        : { unit: unit.trim() || 'pc' }),
      active,
    }
    if (image !== undefined) body.image = image ?? ''
    if (!item) body.stockQty = Math.max(0, Math.floor(parseNum(stockQty)))
    const r = item
      ? await mutate(`menu-items/${item.id}`, { method: 'PATCH', body, toast: 'Menu item updated' })
      : await mutate('menu-items', { body, toast: 'Menu item added' })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? `Edit · ${item.name}` : 'Add Menu Item'}
      width={420}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={!name.trim() || parseNum(price) <= 0} onClick={save}>
            {item ? 'Save Item' : 'Add Item'}
          </Btn>
        </>
      }
    >
      {/* product photo — den_app item sheet parity */}
      <div className="logo-row" style={{ marginBottom: 10 }}>
        <div className="logo-preview" style={{ width: 54, height: 54 }}>
          {preview ? <img src={preview} alt={name || 'Item'} /> : <span className="logo-empty"><ImageOff size={16} /></span>}
        </div>
        <div className="stack-xs">
          <input ref={imgRef} type="file" accept="image/*" className="hidden-file" onChange={(e) => pickImage(e.target.files?.[0])} />
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
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Category"><TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cafe / Snacks / Drinks" /></Field>
        <Field label="Selling Price *"><TextInput inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="40" /></Field>
        <Field label="Purchase ₹/piece" hint="cost — used for profit tracking">
          <TextInput inputMode="decimal" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="15" />
        </Field>
        <Field label="Unit"><TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pc / cup / plate" /></Field>
        <Field label="Reorder level" hint="is se neeche = low-stock alert">
          <TextInput inputMode="numeric" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="5" />
        </Field>
        {!item && (
          <Field label="Opening Stock" hint="re-stock later anytime">
            <TextInput inputMode="numeric" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="0" />
          </Field>
        )}
      </div>
      <label className="check-row">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Active (shown on billing chips)</span>
      </label>
      {item && <p className="muted small">Stock qty changes via the Restock button so every purchase is recorded as an expense.</p>}
    </Modal>
  )
}

// ----------------------------------------------------------- restock modal

function RestockModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: MenuItem }) {
  const { mutate } = useClub()
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState(String(item.costPrice || ''))
  const [busy, setBusy] = useState(false)

  const qtyNum = Math.max(0, Math.floor(parseNum(qty)))
  const costNum = parseNum(unitCost)
  const total = qtyNum * costNum

  const save = async () => {
    if (qtyNum <= 0) return
    setBusy(true)
    const r = await mutate(`menu-items/${item.id}/restock`, {
      body: { qty: qtyNum, unitCost: costNum },
      toast: `Stock added · ${item.name} +${qtyNum} pcs · expense ${formatCurrency(total)}`,
    })
    setBusy(false)
    if (r) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Restock · ${item.name}`}
      width={380}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="green" loading={busy} disabled={qtyNum <= 0} onClick={save}>Add Stock</Btn>
        </>
      }
    >
      <p className="muted small">Current stock: <b>{item.stockQty} pcs</b> · cost {formatCurrency(item.costPrice)}/pc</p>
      <div className="form-grid two">
        <Field label="Quantity (pcs)"><TextInput inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50" autoFocus /></Field>
        <Field label="Purchase ₹/piece"><TextInput inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="15" /></Field>
      </div>
      <p className="small money-gold">Purchase total {formatCurrency(total)} — auto-recorded as a Stock expense this month.</p>
    </Modal>
  )
}

// ================================================================ screen

export default function ItemsScreen() {
  const { data, mutate, club, refresh } = useClub()
  const toast = useToast()
  const navigate = useNavigate()
  const menuItems = useMemo(() => data?.menuItems ?? [], [data])
  const members = data?.members ?? []

  const [itemModal, setItemModal] = useState<{ item: MenuItem | null } | null>(null)
  const [confirmDel, setConfirmDel] = useState<MenuItem | null>(null)
  const [restock, setRestock] = useState<MenuItem | null>(null)
  const [delBusy, setDelBusy] = useState(false)

  // New item bill state
  const [qty, setQty] = useState<Record<string, number>>({})
  const [customer, setCustomer] = useState('')
  const [memberId, setMemberId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [mode, setMode] = useState<PaymentMode>('cash')
  // BACKEND-FIX 6: mixed mode split (sum must equal total exactly)
  const [mix, setMix] = useState({ cash: '', upi: '', card: '' })
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  // ★ den_app offline_queue.dart — counter sales queue + auto-sync
  const [queued, setQueued] = useState(() => pendingCount())
  const [syncing, setSyncing] = useState(false)

  const runSync = useCallback(async () => {
    if (pendingCount() === 0 || syncing) return
    setSyncing(true)
    const { sent, failed } = await syncQueue()
    setQueued(pendingCount())
    setSyncing(false)
    if (sent > 0) {
      toast.success(`${sent} offline bill${sent > 1 ? 's' : ''} synced`)
      await refresh()
    }
    failed.forEach((f) => toast.error(`Queued bill dropped — ${f}`))
  }, [syncing, toast, refresh])

  useEffect(() => {
    const onQueue = (e: Event) => setQueued((e as CustomEvent<number>).detail ?? pendingCount())
    const onOnline = () => void runSync()
    window.addEventListener(QUEUE_EVENT, onQueue)
    window.addEventListener('online', onOnline)
    if (navigator.onLine) void runSync()
    return () => {
      window.removeEventListener(QUEUE_EVENT, onQueue)
      window.removeEventListener('online', onOnline)
    }
  }, [runSync])

  const activeItems = menuItems.filter((m) => m.active)
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const item of menuItems) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()]
  }, [menuItems])

  const member = members.find((m) => m.id === memberId) ?? null
  const selected = activeItems.filter((m) => (qty[m.id] ?? 0) > 0)
  const subtotal = selected.reduce((s, m) => s + (qty[m.id] ?? 0) * m.price, 0)
  const discountNum = Math.min(parseNum(discount), subtotal)
  const total = Math.max(0, subtotal - discountNum)

  // BACKEND-FIX 4/5: backend payment semantics
  //  cash/upi/card → FULL payment auto (paid:true), koi partial nahi
  //  wallet        → member ka wallet FULL total cover kare (warna 400)
  //  due           → poora total member ke due me (paid:false)
  //  mixed         → payments[] ka sum EXACTLY total
  const walletShort = mode === 'wallet' && !!member && member.walletBalance < total
  const mixParts = (['cash', 'upi', 'card'] as const)
    .map((k) => ({ mode: k, amount: parseNum(mix[k]) }))
    .filter((p) => p.amount > 0)
  const mixSum = mixParts.reduce((s, p) => s + p.amount, 0)
  const mixMismatch = mode === 'mixed' && Math.round(mixSum * 100) !== Math.round(total * 100)

  const estProfit = selected.reduce((s, m) => s + (qty[m.id] ?? 0) * Math.max(0, m.price - m.costPrice), 0) - discountNum

  const canCreate =
    selected.length > 0 &&
    total > 0 &&
    !!(customer.trim() || member) &&
    ((mode !== 'wallet' && mode !== 'due') || !!member) &&
    !walletShort &&
    !mixMismatch

  const bump = (id: string, delta: number) =>
    setQty((q) => {
      const item = menuItems.find((m) => m.id === id)
      const cap = item ? Math.max(0, item.stockQty) : Number.POSITIVE_INFINITY
      return { ...q, [id]: Math.min(cap, Math.max(0, (q[id] ?? 0) + delta)) }
    })

  const createBill = async () => {
    if (!customer.trim() && !member) {
      toast.error('Customer name is required — or pick a member')
      return
    }
    if (selected.length === 0) {
      toast.error('Add at least one item')
      return
    }
    if ((mode === 'wallet' || mode === 'due') && !member) {
      toast.error('Select a member for wallet/due bills')
      return
    }
    if (walletShort) {
      toast.error(`Wallet balance short — ${formatCurrency(member?.walletBalance ?? 0)} available, full cover chahiye`)
      return
    }
    if (mixMismatch) {
      toast.error(`Mixed payments ka total ${formatCurrency(total)} hona chahiye (abhi ${formatCurrency(mixSum)})`)
      return
    }
    const billName = customer.trim() || member?.name || ''
    const payload = {
      customerName: billName,
      memberId: memberId || null,
      // BACKEND-FIX 2: menuItemId (backend model ka field)
      items: selected.map((m) => ({ menuItemId: m.id, qty: qty[m.id] })),
      discount: discountNum,
      // BACKEND-FIX 3: `mode` (paymentMode backend ignore karta tha)
      mode,
      // BACKEND-FIX 6: mixed payments[] — sum exactly total
      ...(mode === 'mixed' ? { payments: mixParts } : {}),
      // paidAmount/notes backend pe nahi jaate (ItemBillIn me fields nahi hain)
    }
    setBusy(true)
    let r: unknown = null
    try {
      if (!club) throw new ApiError(0, 'No club selected')
      r = await api(`/clubs/${club.id}/item-bills`, { method: 'POST', body: payload })
      toast.success(`Item bill created · ${billName} · ${formatCurrency(total)}`)
      await refresh()
    } catch (e) {
      // ★ offline → queue it locally and replay when the API is back (app parity)
      if (club && isOfflineError(e)) {
        enqueueBill(club.id, payload, `${billName} · ${formatCurrency(total)}`)
        setQueued(pendingCount())
        toast.info(`Offline — bill queued (${pendingCount()} pending)`)
        setBusy(false)
        setQty({})
        setCustomer('')
        setDiscount('0')
        setMix({ cash: '', upi: '', card: '' })
        return
      }
      toast.error(e instanceof ApiError ? e.message : 'Could not create the bill')
    }
    setBusy(false)
    if (r) {
      // BACKEND-FIX 1: response { bill, message } hai — bill UNWRAP karo
      // (pehle poora object receipt ko ja raha tha → items undefined → crash → blank page)
      const bill = (r as { bill?: ItemBill }).bill ?? (r as ItemBill)
      setReceipt(itemBillReceipt(bill, data?.club?.name ?? 'Club'))
      setQty({})
      setCustomer('')
      setDiscount('0')
      setMix({ cash: '', upi: '', card: '' })
    }
  }

  const doDeleteItem = async () => {
    if (!confirmDel) return
    setDelBusy(true)
    const r = await mutate(`menu-items/${confirmDel.id}`, { method: 'DELETE', toast: `Menu item deleted · ${confirmDel.name}` })
    setDelBusy(false)
    if (r) setConfirmDel(null)
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div className="row">
          {queued > 0 && (
            <Btn variant="gold" size="sm" loading={syncing} onClick={() => void runSync()} title="Replay offline bills">
              <CloudOff size={12} /> {queued} pending <RefreshCw size={11} />
            </Btn>
          )}
          <button className="btn-icon" aria-label="All Item Bills" title="All Item Bills" onClick={() => navigate('/item-bills')}>
            <Receipt size={15} />
          </button>
          <Btn variant="green" onClick={() => setItemModal({ item: null })}>
            <Plus size={13} /> Add Menu Item
          </Btn>
        </div>
      </div>

      <InsightsCard scopes={['stock']} max={4} title="Smart Insights · Stock" />

      <div className="items-layout">
        {/* ---------- New Item Bill ---------- */}
        <Card className="new-bill">
          <div className="section-title">New Item Bill</div>
          {activeItems.length === 0 ? (
            <EmptyState title="No menu items" hint="Add items to start billing." />
          ) : (
            <div className="chip-row item-chips">
              {activeItems.map((m) => {
                const out = m.stockQty <= 0
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`item-chip${(qty[m.id] ?? 0) > 0 ? ' has-qty' : ''}${out ? ' out-of-stock' : ''}`}
                    disabled={out}
                    title={out ? 'Out of stock — restock from the menu list' : `${m.stockQty} in stock`}
                    onClick={() => bump(m.id, 1)}
                  >
                    <Plus size={10} />
                    <span className="item-chip-name">{m.name}</span>
                    <span className="money-gold">{formatCurrency(m.price)}</span>
                    <span className={`stock-pill${out ? ' zero' : m.stockQty <= (m.reorderLevel ?? 5) ? ' low' : ''}`} title={`Low-stock alert at ≤${m.reorderLevel ?? 5}`}>{m.stockQty}</span>
                    {(qty[m.id] ?? 0) > 0 && <span className="qty-badge">{qty[m.id]}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {selected.length > 0 && (
            <div className="sel-items">
              {selected.map((m) => (
                <div className="sel-item" key={m.id}>
                  <span className="sel-item-name">{m.name}</span>
                  <span className="qty-ctl">
                    <button aria-label="Decrease" onClick={() => bump(m.id, -1)}>-</button>
                    <b>{qty[m.id]}</b>
                    <button aria-label="Increase" onClick={() => bump(m.id, 1)}>+</button>
                  </span>
                  <span className="money-gold small">{formatCurrency((qty[m.id] ?? 0) * m.price)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="form-grid two">
            <Field label={member ? 'Customer Name (from member)' : 'Customer Name *'}>
              <TextInput value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in customer" />
            </Field>
            <Field label="Member (optional — enables wallet/due)">
              <Select
                value={memberId}
                onChange={(e) => {
                  const id = e.target.value
                  setMemberId(id)
                  // Picked a member with the name box empty? Their name becomes the bill name (v3.10).
                  if (id && !customer.trim()) {
                    const m = members.find((x) => x.id === id)
                    if (m) setCustomer(m.name)
                  }
                }}
              >
                <option value="">Guest / no member</option>
                {members.filter((m) => m.active).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.dueAmount > 0 ? ` (due ${formatCurrency(m.dueAmount)})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Discount">
              <TextInput inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label="Payment Mode">
              <Select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="wallet">Wallet (member)</option>
                <option value="due">Due (member)</option>
                <option value="mixed">Mixed</option>
              </Select>
            </Field>
          </div>

          {/* BACKEND-FIX 4: wallet full-cover rule */}
          {mode === 'wallet' && member && (
            walletShort ? (
              <p className="small" style={{ color: 'var(--red, #ff5544)' }}>
                Wallet balance {formatCurrency(member.walletBalance)} — full {formatCurrency(total)} cover nahi kar paayega.
                Due ya Mixed mode use karo (partial wallet backend allow nahi karta).
              </p>
            ) : (
              <p className="small money-gold">Wallet se poora {formatCurrency(total)} katega · balance {formatCurrency(member.walletBalance)}.</p>
            )
          )}

          {/* BACKEND-FIX 5: due = full amount to member due */}
          {mode === 'due' && member && (
            <p className="small" style={{ color: 'var(--gold, #e0b34c)' }}>
              Poora {formatCurrency(total)} {member.name} ke due me jayega — collect baad me Due Desk se (ya mark-paid).
            </p>
          )}

          {/* BACKEND-FIX 6: mixed split editor */}
          {mode === 'mixed' && (
            <div className="form-grid two" style={{ margin: '6px 0' }}>
              {(['cash', 'upi', 'card'] as const).map((k) => (
                <Field key={k} label={`${k.toUpperCase()} ₹`}>
                  <TextInput
                    inputMode="decimal"
                    value={mix[k]}
                    onChange={(e) => setMix((s) => ({ ...s, [k]: e.target.value }))}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
          )}
          {mode === 'mixed' && (
            <p className="small" style={{ color: mixMismatch ? 'var(--red, #ff5544)' : 'var(--green, #35d07f)' }}>
              Mixed sum {formatCurrency(mixSum)} / {formatCurrency(total)}
              {mixMismatch ? ' — total ke barabar hona chahiye' : ' ✓'}
            </p>
          )}

          <div className="bill-rows">
            <div className="bill-row"><span>Subtotal</span><b>{formatCurrency(subtotal)}</b></div>
            {discountNum > 0 && <div className="bill-row neg"><span>Discount</span><b>-{formatCurrency(discountNum)}</b></div>}
            <div className="bill-row total"><span>Total</span><b>{formatCurrency(total)}</b></div>
            {mode === 'due' && <div className="bill-row neg"><span>Goes to due</span><b>{formatCurrency(total)}</b></div>}
            {estProfit > 0 && <div className="bill-row pos"><span>Est. profit (sell - cost)</span><b>{formatCurrency(estProfit)}</b></div>}
            <div className="bill-row muted"><span>Payment recorded by</span><b>server (final amounts)</b></div>
          </div>

          <Btn variant="green" className="btn-block" loading={busy} disabled={!canCreate} onClick={createBill}>
            Create Bill {total > 0 ? `· ${formatCurrency(total)}` : ''}
          </Btn>
        </Card>

        {/* ---------- Menu management ---------- */}
        <div className="stack-sm">
          <div className="section-title">Menu · {menuItems.length} items</div>
          {grouped.length === 0 && <EmptyState title="No menu items yet" hint="Add tea, cold drinks, snacks…" />}
          {grouped.map(([cat, items]) => (
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
                      <span className={`stock-pill${m.stockQty <= 0 ? ' zero' : m.stockQty <= (m.reorderLevel ?? 5) ? ' low' : ''}`} title={`Cost ${formatCurrency(m.costPrice)}/pc · alert at ≤${m.reorderLevel ?? 5}`}>
                        {m.stockQty} pcs
                      </span>
                    </span>
                    <span className="menu-price">
                      <span className="money-gold">{formatCurrency(m.price)}</span>
                      <span className="muted small">cost {formatCurrency(m.costPrice)}</span>
                    </span>
                    <button className="btn-icon" aria-label={`Restock ${m.name}`} title="Restock (adds expense)" onClick={() => setRestock(m)}>
                      <PackagePlus size={12} />
                    </button>
                    <button className="btn-icon" aria-label={`Edit ${m.name}`} title="Edit" onClick={() => setItemModal({ item: m })}>
                      <Pencil size={12} />
                    </button>
                    <button className="btn-icon danger" aria-label={`Delete ${m.name}`} title="Delete" onClick={() => setConfirmDel(m)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {itemModal && <ItemModal open onClose={() => setItemModal(null)} item={itemModal.item} />}
      {restock && <RestockModal open onClose={() => setRestock(null)} item={restock} />}
      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} receipt={receipt} />
      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={doDeleteItem}
        busy={delBusy}
        title="Delete menu item"
        message={confirmDel ? `Delete ${confirmDel.name} from the menu? Past bills are not affected.` : ''}
      />
    </div>
  )
}

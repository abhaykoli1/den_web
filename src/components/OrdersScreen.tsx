// Member-app orders — port of den_app `lib/src/screens/orders_screen.dart`.
// GET /clubs/{id}/orders · search + status filter · tone-coded status badges.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, ShoppingBag } from 'lucide-react'
import { api, ApiError, asArray } from '../lib/api'
import { useClub } from '../context/ClubContext'
import { Badge, Btn, Card, EmptyState, FullLoader, Seg, StatCard } from './ui'
import { formatCurrency, formatDateTime } from '../lib/format'
import type { MemberOrder, MemberOrderItem } from '../types'

type Filter = 'all' | 'pending' | 'completed'

const statusOf = (o: MemberOrder) => String(o.status ?? o.orderStatus ?? 'pending')
const itemsOf = (o: MemberOrder): MemberOrderItem[] => asArray<MemberOrderItem>(o.items ?? o.orderItems)
const itemName = (i: MemberOrderItem) => i.name ?? i.itemName ?? i.menuItemName ?? 'Item'
const customerOf = (o: MemberOrder) => o.memberName ?? o.customerName ?? o.member?.name ?? 'Walk-in customer'
const totalOf = (o: MemberOrder) => Number(o.total ?? o.amount ?? o.grandTotal ?? 0) || 0

/** orders_screen.dart → _statusColor */
function statusKind(status: string): 'green' | 'red' | 'gold' {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'ready':
    case 'delivered':
      return 'green'
    case 'cancelled':
    case 'rejected':
      return 'red'
    default:
      return 'gold'
  }
}

export default function OrdersScreen() {
  const { club } = useClub()
  const [orders, setOrders] = useState<MemberOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    if (!club) return
    setLoading(true)
    setError(null)
    try {
      const res = await api<any>(`/clubs/${club.id}/orders`)
      const raw = Array.isArray(res) ? res : res?.orders
      setOrders(asArray<MemberOrder>(raw))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Orders could not load')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [club?.id])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      const status = statusOf(o).toLowerCase()
      if (filter !== 'all' && status !== filter) return false
      if (!q) return true
      const items = itemsOf(o).map(itemName).join(' ')
      return `${o.id ?? ''} ${o.orderNumber ?? ''} ${customerOf(o)} ${items} ${status}`.toLowerCase().includes(q)
    })
  }, [orders, query, filter])

  const pending = orders.filter((o) => statusKind(statusOf(o)) === 'gold').length
  const revenue = orders
    .filter((o) => statusKind(statusOf(o)) === 'green')
    .reduce((s, o) => s + totalOf(o), 0)

  if (!club) return <EmptyState title="No club selected" hint="Pick a club to see its orders." />

  return (
    <div className="stack">
      <div className="grid-stats three">
        <StatCard label="Orders" value={String(orders.length)} tone="blue" sub="from the member app" />
        <StatCard label="Pending" value={String(pending)} tone="gold" sub="need action" />
        <StatCard label="Completed value" value={formatCurrency(revenue)} tone="green" sub="delivered orders" />
      </div>

      <div className="row wrap" style={{ alignItems: 'center' }}>
        <span className="search-box">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, member or item"
            aria-label="Search orders"
          />
        </span>
        <Seg<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Order status filter"
          options={[
            { value: 'all', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <span className="spacer" />
        <Btn variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw size={12} /> Refresh
        </Btn>
      </div>

      {loading ? (
        <FullLoader label="Loading orders…" />
      ) : error ? (
        <Card>
          <EmptyState title="Orders could not load" hint={error} icon={<ShoppingBag size={22} />} />
          <Btn variant="outline" className="mt" onClick={() => void load()}>
            <RefreshCw size={12} /> Try again
          </Btn>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState title="No orders yet" hint="Member app orders will appear here." icon={<ShoppingBag size={22} />} />
        </Card>
      ) : (
        <div className="stack-sm">
          {visible.map((o, i) => {
            const status = statusOf(o)
            const items = itemsOf(o)
            const itemText = items.map((it) => `${itemName(it)} x${it.qty ?? it.quantity ?? 1}`).join(', ')
            return (
              <Card key={o.id ?? o.orderNumber ?? i} className="order-card">
                <div className="order-head">
                  <span className="order-no">{o.orderNumber ?? `#${o.id ?? 'Order'}`}</span>
                  <Badge kind={statusKind(status)}>{status}</Badge>
                </div>
                <div className="order-cust">
                  {customerOf(o)}
                  {o.tableName ? ` · ${o.tableName}` : ''}
                </div>
                {itemText && <div className="order-items">{itemText}</div>}
                <div className="order-foot">
                  <span className="order-total money">{formatCurrency(totalOf(o))}</span>
                  <span className="order-time">{formatDateTime(o.createdAt ?? o.orderedAt) || ''}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

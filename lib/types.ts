/*
 * Shapes of the store API's /api/admin responses. The source of truth is
 * ../nav-pro-listing/api/src/routes/admin.ts and api/src/admin/*.ts.
 */

export type Figures = {
  orders: number
  units: number
  revenueIncGst: number
  gst: number
  revenueExGst: number
  productsExGst: number
  deliveryExGst: number
  costOfGoodsExGst: number
  grossProfitExGst: number
  grossMarginPct: number | null
  marketingExGst: number
  profitAfterMarketingExGst: number
  deliveryCostExGst: number
  ordersWithoutDeliveryCost: number
  paymentFeesExGst: number
  netProfitExGst: number
  netMarginPct: number | null
  averageOrderIncGst: number | null
  linesWithoutCost: number
}

export type SalesReport = {
  from: string
  to: string
  interval: 'day' | 'month'
  timezone: string
  series: (Figures & { period: string })[]
  totals: Figures
  allTime: Figures & { firstSaleAt: string | null }
  refunds: { orders: number; totalIncGst: number }
  topProducts: { partId: number | null; partNo: string; title: string; units: number; revenueIncGst: number; profitExGst: number | null }[]
}

export type Breakdown = {
  from: string
  to: string
  by: 'category' | 'brand' | 'supplier' | 'product'
  sort: 'revenue' | 'profit' | 'margin' | 'units'
  items: {
    key: string
    label: string
    partId: number | null
    orders: number
    units: number
    revenueIncGst: number
    revenueExGst: number
    costExGst: number | null
    profitExGst: number | null
    marginPct: number | null
  }[]
}

export type Overview = {
  today: string
  timezone: string
  toPack: number
  packing: number
  shippedThisWeek: number
  unpaidCheckoutsToday: number
  todaySales: Figures
  monthSales: Figures
  monthBudget: { month: string; budgetExGst: number | null; spentExGst: number }
  paymentsNeedingAttention: { orderNo: string; status: string; provider: string; amountIncGst: number; at: string }[]
}

export type OrderStatus = 'pending' | 'paid' | 'packing' | 'shipped' | 'cancelled' | 'refunded'

export type OrderSummary = {
  orderNo: string
  status: OrderStatus
  customerName: string
  email: string
  totalIncGst: number
  items: number
  shippingLabel: string
  state: string
  postcode: string
  carrier: string | null
  trackingNumber: string | null
  provider: string | null
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
}

export type Page<T> = { total: number; page: number; limit: number; items: T[] }

export type Change = { from: unknown; to: unknown }
export type HistoryEntry = { actor: string | null; action: string; changes: Record<string, Change> | null; at: string }

export type OrderLine = {
  partId: number | null
  partNo: string
  brand: string | null
  title: string
  image: string | null
  qty: number
  unitIncGst: number
  lineIncGst: number
  supplier: string | null
  supplierSku: string | null
  supplierBrand: string | null
  supplierTitle: string | null
  ownStock: { qty: number; location: string | null } | null
  // Absent for staff.
  unitCostExGst?: number | null
  lineCostExGst?: number | null
  lineProfitExGst?: number | null
}

export type OrderDetail = {
  orderNo: string
  status: OrderStatus
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  cancelledAt: string | null
  updatedAt: string
  email: string
  phone: string
  customerName: string
  userId: number | null
  shipAddress: { fullName: string; company?: string | null; phone?: string | null; street1: string; street2?: string | null; suburb: string; state: string; postcode: string }
  abn: string | null
  shippingLabel: string
  subtotalIncGst: number
  shippingIncGst: number
  totalIncGst: number
  gstAmount: number
  customerNotes: string | null
  adminNotes: string | null
  carrier: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  nextStatuses: OrderStatus[]
  // Absent for staff.
  shippingCostExGst?: number | null
  profit?: { revenueExGst: number; costOfGoodsExGst: number | null; grossProfitExGst: number | null; grossMarginPct: number | null }
  items: OrderLine[]
  payments: {
    provider: string
    intentId: string
    captureId: string | null
    status: string
    amountIncGst: number
    failureMessage: string | null
    createdAt: string
  }[]
  history: HistoryEntry[]
  notified?: boolean
}

export type ProductRow = {
  id: number
  partNo: string
  title: string
  brand: string | null
  productType: string | null
  image: string | null
  sellIncGst: number | null
  rrpIncGst: number | null
  costExGst: number | null
  costIncGst: number | null
  marginPct: number | null
  stock: string | null
  ownStock: number | null
  published: boolean
  edited: boolean
  editedAt: string | null
  editedBy: string | null
  supplier: string
  supplierSku: string | null
  supplierBrand: string | null
  supplierTitle: string | null
}

export type ProductDetail = {
  id: number
  partNo: string
  productType: string | null
  storefrontUrl: string | null
  current: { title: string; brand: string | null; description: string | null; image: string | null; sellIncGst: number | null; published: boolean; live: boolean; stock: string }
  supplier: {
    name: string
    sku: string | null
    brand: string | null
    title: string | null
    description: string | null
    comments: string | null
    image: string | null
    autoSellIncGst: number | null
    autoPublished: boolean
  }
  override: {
    title: string | null
    description: string | null
    sellIncGst: number | null
    imageUrl: string | null
    published: boolean | null
    notes: string | null
    updatedAt: string | null
    updatedBy: string | null
  }
  pricing: {
    costExGst: number | null
    costIncGst: number | null
    rrpIncGst: number | null
    sellIncGst: number | null
    marginPct: number | null
    marginDollarsExGst: number | null
    rrpMarginPct: number | null
    history: { costExGst: number | null; costIncGst: number | null; rrpIncGst: number | null; at: string }[]
  }
  ownStock: { qty: number; location: string | null; updatedBy: string | null; updatedAt: string } | null
  stock: { national: string | null; warehouse: number | null; at: string } | null
  categories: { category: string; vehicles: number }[]
  sales: { units: number; orders: number; revenueIncGst: number }
  history: HistoryEntry[]
}

export type Spend = {
  id: number
  spentOn: string
  channel: string
  description: string | null
  amountExGst: number
  gst: number
  amountIncGst: number
  createdBy: string | null
  createdAt: string
}

export type Budget = { month: string; budgetExGst: number | null; spentExGst: number; updatedBy: string | null }

export type Zone = {
  id: string
  name: string
  states: string[] | null
  postcode_from: string | null
  postcode_to: string | null
  priority: number
  is_active: boolean
}

export type Rate = {
  id: string
  zone_id: string
  zone_name: string
  name: string
  price_inc_gst: string
  free_over_inc_gst: string | null
  eta_text: string | null
  priority: number
  is_active: boolean
}

export type PriceRule = { id: string; brand: string | null; category: string | null; markup_pct: string; priority: number; created_at: string }
export type BrandCode = { code: string; name: string; parts: number }

export type Customer = {
  email: string
  name: string
  phone: string
  orders: number
  spentIncGst: number
  firstOrderAt: string | null
  lastOrderAt: string | null
  hasAccount: boolean
}

export type CustomerDetail = {
  email: string
  name: string
  phone: string
  lastAddress: OrderDetail['shipAddress']
  account: { name: string | null; phone: string | null; createdAt: string } | null
  orders: number
  spentIncGst: number
  history: { orderNo: string; status: OrderStatus; totalIncGst: number; items: number; paidAt: string | null; createdAt: string }[]
}

export type AuditEntry = {
  id: number
  actor: string | null
  entity: string
  entityId: string
  label: string | null
  action: string
  changes: Record<string, Change> | null
  at: string
  revertible: boolean
}

export type TeamMember = {
  id: number
  email: string
  name: string | null
  role: 'owner' | 'staff'
  isActive: boolean
  createdBy: string | null
  createdAt: string
  lastLoginAt: string | null
}

export type Fee = { pct: number; fixed: number }
export type Settings = {
  payment_fees: { value: { stripe: Fee; paypal: Fee }; updatedBy: string | null; updatedAt: string | null }
  order_alert_emails: { value: string[]; updatedBy: string | null; updatedAt: string | null }
}

/** A server action's result, shaped for useActionState. */
export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]>; source?: string }

export type BlogPostAdmin = {
  id: number
  slug: string
  title: string
  excerpt: string | null
  bodyMd: string
  coverImageUrl: string | null
  coverAlt: string | null
  status: 'draft' | 'published'
  publishedAt: string | null
  authorName: string | null
  seoTitle: string | null
  seoDescription: string | null
  relatedQuery: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
  words?: number
  history?: HistoryEntry[]
}

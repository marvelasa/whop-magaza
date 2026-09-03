/**
 * MARVELASA — standalone Express server for self-hosting the storefront on
 * your own domain, while every payment still runs through real Whop
 * Payments infrastructure.
 *
 * Mirrors the Whop-hosted site's own logic:
 *  - pricing + checkout-session creation (src/lib/plans.ts + checkout-session.ts)
 *  - buyer-facing order lookup (src/lib/shipments.ts trackOrder)
 * just running on a plain Node.js server instead of a Whop-hosted Cloudflare
 * Worker, so it can live on any domain/host you own.
 */
require('dotenv').config()
const express = require('express')
const path = require('path')

const app = express()
app.use(express.json())
app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'public', '.well-known', 'apple-developer-merchantid-domain-association')
  )
})
const COMPANY_ID = 'biz_7piuls4sNczwad'
const PRODUCT_ID = 'prod_pnIOT5MSdvPMC'
const API_VERSION_DATE = '2026-07-29'
const MAX_QTY = 10
const PAYMENT_ID = /^pay_[A-Za-z0-9]{4,60}$/

const PAYMENTS_URL = 'https://api.whop.com/api/v1/payments'
const MEMBERSHIPS_URL = 'https://api.whop.com/api/v1/memberships'
const CHECKOUT_CONFIGS_URL = 'https://api.whop.com/api/v1/checkout_configurations'

const MANUAL_STATUS_LABELS = {
  hazirlaniyor: 'Hazırlanıyor',
  kargoya_verildi: 'Kargoya Verildi',
  dagitimda: 'Dağıtımda',
  teslim_edildi: 'Teslim Edildi',
}

/** Same three real bundles/prices as the Whop-hosted site. */
const BUNDLES = {
  one: { price: 1849, compareAt: 3350, qty: 1 },
  two: { price: 3698, compareAt: 6700, qty: 2 },
  three: { price: 7396, compareAt: 13400, qty: 4 },
}

const MODELS = ['Harry Potter', 'Lord Voldemort', 'Dumbledore', 'Hermione Granger', 'Severus Snape']

/** Same three paid add-ons as cart.js's ADDONS — keep both in sync. */
const ADDONS = {
  'kagit-x2': { price: 149 },
  'kagit-x4': { price: 249 },
  'garanti-2yil': { price: 299 },
}

function whopHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Api-Version-Date': API_VERSION_DATE,
  }
}

function computeTotal(lines, addonIds) {
  let total = 0
  for (const line of lines) {
    const bundle = BUNDLES[line.bundleId]
    if (!bundle) throw new Error(`Unknown bundle: ${line.bundleId}`)
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY) {
      throw new Error(`qty must be a whole number between 1 and ${MAX_QTY}`)
    }
    total += bundle.price * line.qty
  }
  for (const id of addonIds) {
    const addon = ADDONS[id]
    if (addon) total += addon.price
  }
  return Math.round(total * 100) / 100
}

// ---------- checkout ----------

app.post('/api/checkout-session', async (req, res) => {
  try {
    const apiKey = process.env.WHOP_CHECKOUT_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Sunucu WHOP_CHECKOUT_API_KEY olmadan çalıştırılıyor — .env dosyasını doldur.' })
    }

    const { lines, addonIds } = req.body || {}
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines must be a non-empty array' })
    }

    const safeLines = lines.map((raw) => {
      const bundleId = BUNDLES[raw?.bundleId] ? raw.bundleId : null
      if (!bundleId) throw new Error(`Unknown bundle in cart: ${JSON.stringify(raw?.bundleId)}`)
      const model = MODELS.includes(raw?.model) ? raw.model : MODELS[0]
      return { bundleId, qty: raw.qty, model }
    })
    const safeAddonIds = Array.isArray(addonIds) ? addonIds.filter((id) => ADDONS[id]) : []

    const amount = computeTotal(safeLines, safeAddonIds)
    if (amount <= 0) {
      return res.status(400).json({ error: 'Cart total must be greater than zero' })
    }

    const response = await fetch(CHECKOUT_CONFIGS_URL, {
      method: 'POST',
      headers: { ...whopHeaders(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: COMPANY_ID,
        mode: 'payment',
        plan: {
          account_id: COMPANY_ID,
          product_id: PRODUCT_ID,
          title: 'Sihirli Asa siparişi',
          plan_type: 'one_time',
          currency: 'try',
          initial_price: amount,
        },
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return res.status(502).json({ error: `Whop checkout_configurations failed (${response.status}): ${detail.slice(0, 300)}` })
    }

    const json = await response.json()
    if (!json.id) {
      return res.status(502).json({ error: 'Whop response did not include a session id' })
    }

    res.json({ sessionId: json.id, amount })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

// ---------- buyer-facing order lookup (Siparişinizi Takip Edin) ----------

function toShipmentInfo(raw) {
  if (!raw || typeof raw.status !== 'string' || typeof raw.tracking_number !== 'string' || typeof raw.tracking_url !== 'string') {
    return null
  }
  return {
    status: raw.status,
    trackingNumber: raw.tracking_number,
    carrier: typeof raw.carrier === 'string' ? raw.carrier : null,
    trackingUrl: raw.tracking_url,
  }
}

async function fetchManualStatus(apiKey, membershipId) {
  try {
    const res = await fetch(`${MEMBERSHIPS_URL}/${membershipId}`, { headers: whopHeaders(apiKey) })
    if (!res.ok) return { status: null, updatedAt: null }
    const body = await res.json()
    const metadata = body.metadata || {}
    const status = Object.prototype.hasOwnProperty.call(MANUAL_STATUS_LABELS, metadata.shipping_status) ? metadata.shipping_status : null
    const updatedAt = typeof metadata.shipping_status_updated_at === 'string' ? metadata.shipping_status_updated_at : null
    return { status, updatedAt }
  } catch {
    return { status: null, updatedAt: null }
  }
}

app.post('/api/track-order', async (req, res) => {
  const NOT_FOUND = { found: false }
  try {
    const apiKey = process.env.WHOP_CHECKOUT_API_KEY
    if (!apiKey) return res.json(NOT_FOUND)

    const orderId = String(req.body?.orderId || '').trim().slice(0, 100)
    const email = String(req.body?.email || '').trim().slice(0, 200)
    if (!PAYMENT_ID.test(orderId) || email === '') return res.json(NOT_FOUND)

    const response = await fetch(`${PAYMENTS_URL}/${orderId}`, { headers: whopHeaders(apiKey) })
    if (!response.ok) return res.json(NOT_FOUND)
    const payment = await response.json()

    // Ownership first — pay_... ids are global to Whop, not scoped to this shop.
    if (payment.company?.id !== COMPANY_ID) return res.json(NOT_FOUND)

    // The one thing that has to match before anything is handed back: proof
    // the caller is the buyer, not just someone who saw a stray order id.
    const onFile = typeof payment.user?.email === 'string' ? payment.user.email.trim().toLowerCase() : ''
    if (onFile === '' || onFile !== email.toLowerCase()) return res.json(NOT_FOUND)

    const membershipId = typeof payment.membership?.id === 'string' ? payment.membership.id : null
    const manual = membershipId ? await fetchManualStatus(apiKey, membershipId) : { status: null, updatedAt: null }

    res.json({
      found: true,
      status: typeof payment.status === 'string' ? payment.status : 'unknown',
      createdAt: typeof payment.created_at === 'string' ? payment.created_at : '',
      total: typeof payment.total === 'number' ? payment.total : null,
      currency: typeof payment.currency === 'string' ? payment.currency : 'try',
      shipment: toShipmentInfo(payment.shipment),
      manualStatus: manual.status,
      manualStatusLabel: manual.status ? MANUAL_STATUS_LABELS[manual.status] : null,
      manualStatusUpdatedAt: manual.updatedAt,
    })
  } catch {
    res.json(NOT_FOUND)
  }
})

// ---------- styles ----------
// Served from this server instead of linking cross-origin to
// marvelasa.whop.app — that file's name changes every time the Whop-hosted
// site rebuilds, which silently breaks every page here. A local copy never
// goes stale from someone else's deploy.
app.get('/styles.css', (req, res) => {
  res.set('Content-Type', 'text/css; charset=utf-8')
  res.sendFile(path.join(__dirname, 'styles.css'))
})

// ---------- shared cart drawer script ----------
// Same file on every page — see cart.js's own header comment for what it does.
app.get('/cart.js', (req, res) => {
  res.set('Content-Type', 'application/javascript; charset=utf-8')
  res.sendFile(path.join(__dirname, 'cart.js'))
})

// ---------- clean-URL page routes, matching the real site's own paths ----------
// Every HTML file lives right next to server.js — no subfolder to place
// things in correctly, so there is nothing to get wrong on upload.

// charset=utf-8 is explicit here, not left to guesswork — without it, some
// browsers' "view source" (the exact way this kit's files get copied into
// GitHub) mis-guess the encoding and turn every Turkish ğ/ı/ş/ü/ö/ç into
// garbage before it's even copied.
const page = (name) => (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8')
  res.sendFile(path.join(__dirname, name))
}
app.get('/', page('index.html'))
app.get('/product', page('product.html'))
app.get('/odeme', page('odeme.html'))
app.get('/siparis-takip', page('siparis-takip.html'))
app.get('/iade-politikasi', page('iade-politikasi.html'))
app.get('/gizlilik-politikasi', page('gizlilik-politikasi.html'))
app.get('/kargo-politikasi', page('kargo-politikasi.html'))
app.get('/kullanim-kosullari', page('kullanim-kosullari.html'))

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`MARVELASA standalone server running on http://localhost:${port}`)
})

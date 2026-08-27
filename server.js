/**
 * MARVELASA — standalone Express server for self-hosting the storefront on
 * your own domain, while every payment still runs through real Whop
 * Payments infrastructure.
 *
 * This mirrors the pricing + checkout-session logic of the Whop-hosted site
 * (src/lib/plans.ts + src/lib/checkout-session.ts) exactly — same bundle
 * prices, same addon prices, same Whop API call — just running on a plain
 * Node.js server instead of a Whop-hosted Cloudflare Worker.
 *
 * The client NEVER sends a price. It sends cart lines (bundle id, quantity,
 * model, addon ids); this server recomputes the total from the tables below
 * and only then asks Whop to mint a checkout session for that amount. This
 * is the same anti-tamper shape the original checkout-session.ts uses.
 */
require('dotenv').config()
const express = require('express')
const path = require('path')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'webroot')))

const COMPANY_ID = 'biz_7piuls4sNczwad'
const PRODUCT_ID = 'prod_pnIOT5MSdvPMC'
const API_VERSION_DATE = '2026-07-29'
const MAX_QTY = 10

/** Same three real bundles/prices as the Whop-hosted site. */
const BUNDLES = {
  one: { price: 1849, compareAt: 3350, qty: 1 },
  two: { price: 3698, compareAt: 6700, qty: 2 },
  three: { price: 7396, compareAt: 13400, qty: 4 },
}

/** Same three real addons/prices as the Whop-hosted site. */
const ADDONS = {
  'kagit-x2': { label: "Sihirli Kağıt — 2'li Yedek Paket", price: 149 },
  'kagit-x4': { label: "Sihirli Kağıt — 4'lü Yedek Paket", price: 249 },
  'garanti-2yil': { label: '+2 Yıl Garanti', price: 299 },
}

const MODELS = ['Harry Potter', 'Lord Voldemort', 'Dumbledore', 'Hermione Granger', 'Severus Snape']

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
    const safeAddonIds = (Array.isArray(addonIds) ? addonIds : []).filter((id) => ADDONS[id])

    const amount = computeTotal(safeLines, safeAddonIds)
    if (amount <= 0) {
      return res.status(400).json({ error: 'Cart total must be greater than zero' })
    }

    const response = await fetch('https://api.whop.com/api/v1/checkout_configurations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Api-Version-Date': API_VERSION_DATE,
      },
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

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`MARVELASA standalone server running on http://localhost:${port}`)
})

/**
 * MARVELASA kit â€” shared cart drawer, loaded on every page.
 *
 * Mirrors the real site's own cart (src/lib/cart.tsx + components/CartDrawer.tsx):
 * "Sepete Ekle" adds a line and opens this slide-in drawer, which totals the
 * order and hands off to /odeme (the checkout page) â€” it never jumps straight
 * to a payment form itself. Cart state persists in localStorage so it
 * survives navigating between pages, same as the real site.
 */
(function () {
  var STORAGE_KEY = 'marvelasa-kit-cart'
  var MAX_QTY = 10

  // Same three bundles/prices as server.js's BUNDLES â€” keep both in sync.
  var BUNDLES = {
    one: { id: 'one', label: '1 Adet', price: 1849, compareAt: 3350, units: 1 },
    two: { id: 'two', label: '2 Adet', price: 3698, compareAt: 6700, units: 2 },
    three: { id: 'three', label: '4 Adet', price: 7396, compareAt: 13400, units: 4 },
  }

  var MODELS = ['Harry Potter', 'Lord Voldemort', 'Dumbledore', 'Hermione Granger', 'Severus Snape']
  var MODEL_IMAGES = {
    'Harry Potter': 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/c697c802-bf85-40d8-9cd4-ea0a727253b0/image.webp',
    'Lord Voldemort': 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/0a236f1f-65c6-410a-b5f4-f746a6e0430b/image.webp',
    Dumbledore: 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/27996eee-9452-4e88-8386-29949e7e4454/image.webp',
    'Hermione Granger': 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/88839c72-b43a-4e6f-a30f-2c255c3686cd/image.webp',
    'Severus Snape': 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/7726c751-5065-459f-a2fa-95d4bcd5cf04/image.webp',
  }

  var GIFT_UNLOCKS = [
    {
      threshold: 1,
      label: 'Ãœcretsiz Sihirli KaÄŸÄ±t',
      body: '1 adet ekstra bÃ¼yÃ¼ kaÄŸÄ±dÄ±, sipariÅŸ kutusuna eklenir.',
      icon: 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/f4142d19-56a4-456e-9207-84b1708ce2d9/image.webp',
    },
    {
      threshold: 1,
      label: 'Ãœcretsiz Kargo',
      body: 'Her sipariÅŸte otomatik olarak dahil.',
      icon: 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/0f87ec02-4920-4f23-ba55-3924b28fe1d2/image.webp',
    },
    {
      threshold: 2,
      label: 'Ãœcretsiz BÃ¼yÃ¼ KÄ±lavuzu',
      body: 'GÃ¶steri ipuÃ§larÄ± iÃ§eren dijital rehber, e-postana gÃ¶nderilir.',
      icon: 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/5cccf68b-09da-43a3-9df7-0d9a936b20a2/image.webp',
    },
    {
      threshold: 3,
      label: 'Gizemli Hediye',
      body: 'Kutuna sÃ¼rpriz bir hediye eklenir.',
      icon: 'https://assets-2-prod.whop.com/public/uploads/2026-08-27/1bf95977-ecfe-4e9f-9400-fb1d63e3a838/image.webp',
    },
  ]

  // Same three paid add-ons as server.js's ADDONS â€” keep both in sync.
  var ADDONS = {
    'kagit-x2': {
      id: 'kagit-x2',
      label: "Sihirli KaÄŸÄ±t â€” 2'li Yedek Paket",
      description: '2 adet ek bÃ¼yÃ¼ kaÄŸÄ±dÄ±, asanÄ± daha uzun sÃ¼re kullan.',
      price: 149,
    },
    'kagit-x4': {
      id: 'kagit-x4',
      label: "Sihirli KaÄŸÄ±t â€” 4'lÃ¼ Yedek Paket",
      description: '4 adet ek bÃ¼yÃ¼ kaÄŸÄ±dÄ±, en avantajlÄ± yedek paket.',
      price: 249,
    },
    'garanti-2yil': {
      id: 'garanti-2yil',
      label: '+2 YÄ±l Garanti',
      description: 'Standart garantine ek 2 yÄ±l kapsama satÄ±n al.',
      price: 299,
    },
  }
  var ADDON_ORDER = ['kagit-x2', 'kagit-x4', 'garanti-2yil']

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { items: [], addonIds: [] }
      var parsed = JSON.parse(raw)
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        addonIds: Array.isArray(parsed.addonIds) ? parsed.addonIds : [],
      }
    } catch (e) {
      return { items: [], addonIds: [] }
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {}
  }

  var state = load()
  var isOpen = false

  function money(n) {
    return (
      n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'TL'
    )
  }
  function lineTotal(line) {
    var b = BUNDLES[line.bundleId]
    return b ? b.price * line.qty : 0
  }
  function totalQty() {
    return state.items.reduce(function (s, i) {
      return s + i.qty
    }, 0)
  }
  function totalUnits() {
    return state.items.reduce(function (s, i) {
      var b = BUNDLES[i.bundleId]
      return s + (b ? b.units * i.qty : 0)
    }, 0)
  }
  function subtotal() {
    return state.items.reduce(function (s, i) {
      return s + lineTotal(i)
    }, 0)
  }
  function addonsSubtotal() {
    return state.addonIds.reduce(function (s, id) {
      var a = ADDONS[id]
      return s + (a ? a.price : 0)
    }, 0)
  }
  function orderTotal() {
    return subtotal() + addonsSubtotal()
  }
  function toggleAddon(id) {
    if (!ADDONS[id]) return
    var idx = state.addonIds.indexOf(id)
    if (idx >= 0) state.addonIds.splice(idx, 1)
    else state.addonIds.push(id)
    notify()
  }

  function notify() {
    persist()
    render()
  }

  function addItem(bundleId, qty, model) {
    if (!BUNDLES[bundleId]) return
    var idx = state.items.findIndex(function (i) {
      return i.bundleId === bundleId
    })
    if (idx >= 0) {
      state.items[idx].qty = Math.min(state.items[idx].qty + qty, MAX_QTY)
      state.items[idx].model = model
    } else {
      state.items.push({ bundleId: bundleId, qty: Math.min(Math.max(qty, 1), MAX_QTY), model: model })
    }
    isOpen = true
    notify()
  }
  function removeItem(bundleId) {
    state.items = state.items.filter(function (i) {
      return i.bundleId !== bundleId
    })
    notify()
  }
  function setQty(bundleId, qty) {
    var idx = state.items.findIndex(function (i) {
      return i.bundleId === bundleId
    })
    if (idx < 0) return
    state.items[idx].qty = Math.max(1, Math.min(qty, MAX_QTY))
    notify()
  }
  function setModel(bundleId, model) {
    var idx = state.items.findIndex(function (i) {
      return i.bundleId === bundleId
    })
    if (idx < 0) return
    state.items[idx].model = model
    notify()
  }
  function clear() {
    state.items = []
    state.addonIds = []
    notify()
  }
  function open() {
    isOpen = true
    render()
  }
  function close() {
    isOpen = false
    render()
  }

  function ensureRoot() {
    var root = document.getElementById('cart-drawer-root')
    if (!root) {
      root = document.createElement('div')
      root.id = 'cart-drawer-root'
      document.body.appendChild(root)
    }
    return root
  }

  function render() {
    var root = ensureRoot()
    var items = state.items
    var sub = subtotal()
    var units = totalUnits()

    var itemsHtml = items
      .map(function (line) {
        var b = BUNDLES[line.bundleId]
        if (!b) return ''
        var img = MODEL_IMAGES[line.model] || MODEL_IMAGES['Harry Potter']
        var modelOptions = MODELS.map(function (m) {
          return '<option value="' + m + '"' + (m === line.model ? ' selected' : '') + '>' + m + '</option>'
        }).join('')
        return (
          '<li class="flex gap-4 border-b border-forest/10 pb-5">' +
          '<img src="' +
          img +
          '" alt="" class="h-16 w-16 shrink-0 self-start rounded-md bg-shot object-contain p-1"/>' +
          '<div class="min-w-0 flex-1">' +
          '<p class="font-bold text-forest">' +
          b.label +
          '</p>' +
          '<p class="text-xs font-semibold uppercase tracking-wide text-forest-soft">Tek seferlik</p>' +
          '<p class="mt-1 text-sm text-ink/60">' +
          money(b.price) +
          ' / adet</p>' +
          '<div class="mt-2"><label class="flex items-center gap-1.5 text-xs font-semibold text-ink/70">Model:' +
          '<select class="cart-model-select rounded border border-ink/15 bg-white px-1.5 py-1 text-xs font-bold text-forest" data-bundle="' +
          line.bundleId +
          '">' +
          modelOptions +
          '</select></label></div>' +
          '<div class="mt-3 inline-flex items-center rounded-md border-2 border-forest/20">' +
          '<button type="button" class="cart-qty-minus flex h-8 w-8 items-center justify-center text-forest disabled:opacity-30" data-bundle="' +
          line.bundleId +
          '"' +
          (line.qty <= 1 ? ' disabled' : '') +
          '>\u2212</button>' +
          '<span class="w-8 text-center text-sm font-semibold tabular-nums text-forest">' +
          line.qty +
          '</span>' +
          '<button type="button" class="cart-qty-plus flex h-8 w-8 items-center justify-center text-forest disabled:opacity-30" data-bundle="' +
          line.bundleId +
          '"' +
          (line.qty >= MAX_QTY ? ' disabled' : '') +
          '>+</button>' +
          '</div>' +
          '</div>' +
          '<div class="flex flex-col items-end justify-between">' +
          '<span class="font-bold text-forest">' +
          money(lineTotal(line)) +
          '</span>' +
          '<button type="button" class="cart-remove text-xs font-semibold text-ink/50 underline-offset-2 transition hover:text-ink hover:underline" data-bundle="' +
          line.bundleId +
          '">KaldÄ±r</button>' +
          '</div>' +
          '</li>'
        )
      })
      .join('')

    var unlocked = GIFT_UNLOCKS.filter(function (g) {
      return units >= g.threshold
    })
    var locked = GIFT_UNLOCKS.filter(function (g) {
      return units < g.threshold
    })
    var giftsHtml = unlocked.length
      ? '<ul class="mt-5 space-y-2">' +
        unlocked
          .map(function (g) {
            return (
              '<li class="flex items-center gap-3 rounded-md bg-blush px-3 py-2.5">' +
              '<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white"><img src="' +
              g.icon +
              '" alt="" aria-hidden="true" class="h-8 w-8 object-contain"/></span>' +
              '<div class="min-w-0 flex-1"><p class="text-sm font-bold leading-snug text-forest">' +
              g.label +
              '</p><p class="text-xs leading-snug text-ink/60">' +
              g.body +
              '</p></div><span class="shrink-0 text-sm font-extrabold text-forest">' +
              money(0) +
              '</span></li>'
            )
          })
          .join('') +
        '</ul>'
      : ''
    var lockedHtml = locked.length
      ? '<ul class="mt-3 space-y-1 px-1 text-xs font-semibold text-ink/50">' +
        locked
          .map(function (g) {
            return '<li>' + g.threshold + ' adet asa al, ' + g.label + ' kazan.</li>'
          })
          .join('') +
        '</ul>'
      : ''

    var addonsHtml =
      items.length > 0
        ? '<div class="mt-5"><p class="text-xs font-extrabold uppercase tracking-wide text-ink/50">SipariÅŸine ekle</p><ul class="mt-2 space-y-2">' +
          ADDON_ORDER.map(function (id) {
            var a = ADDONS[id]
            var checked = state.addonIds.indexOf(id) >= 0
            return (
              '<li><label class="flex cursor-pointer items-start gap-2.5 rounded-md border-2 border-ink/10 px-3 py-2.5 transition hover:border-forest/40">' +
              '<input type="checkbox" class="cart-addon-toggle mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-forest)]" data-addon="' +
              id +
              '"' +
              (checked ? ' checked' : '') +
              '>' +
              '<span class="min-w-0 flex-1"><span class="block text-sm font-bold leading-snug text-ink">' +
              a.label +
              '</span><span class="block text-xs leading-snug text-ink/60">' +
              a.description +
              '</span></span>' +
              '<span class="shrink-0 text-sm font-extrabold text-ink">+' +
              money(a.price) +
              '</span>' +
              '</label></li>'
            )
          }).join('') +
          '</ul></div>'
        : ''

    var bodyHtml =
      items.length === 0
        ? '<div class="flex h-full flex-col items-center justify-center text-center"><p class="text-sm text-ink/60">Sepetin boÅŸ.</p><a href="/product" class="mt-4 rounded-md bg-forest px-5 py-2.5 text-base font-extrabold text-white transition hover:bg-forest-dark">AlÄ±ÅŸveriÅŸe Devam Et</a></div>'
        : '<ul class="space-y-5">' + itemsHtml + '</ul>' + giftsHtml + lockedHtml + addonsHtml

    var addons = addonsSubtotal()
    var total = sub + addons
    var footerHtml =
      items.length > 0
        ? '<div class="border-t border-forest/10 px-6 py-5">' +
          '<div class="flex items-center justify-between text-sm text-ink/70"><span>Ara Toplam</span><span class="font-semibold text-ink">' +
          money(sub) +
          '</span></div>' +
          (addons > 0
            ? '<div class="mt-1 flex items-center justify-between text-sm text-ink/70"><span>Ek ÃœrÃ¼nler</span><span class="font-semibold text-ink">' +
              money(addons) +
              '</span></div>'
            : '') +
          '<div class="mt-2 flex items-center justify-between text-base font-bold text-forest"><span>Toplam</span><span>' +
          money(total) +
          '</span></div>' +
          '<a href="/odeme" class="mt-4 flex w-full items-center justify-center rounded-md bg-forest px-8 py-4 text-lg font-extrabold uppercase tracking-wider text-white transition hover:bg-forest-dark">Ã–demeye GeÃ§</a>' +
          '</div>'
        : ''

    root.innerHTML =
      '<div aria-hidden="true" id="cart-overlay" class="fixed inset-0 z-[60] bg-ink/40 transition-opacity ' +
      (isOpen ? 'opacity-100' : 'pointer-events-none opacity-0') +
      '"></div>' +
      '<aside role="dialog" aria-modal="true" aria-label="Sepet" class="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ' +
      (isOpen ? 'translate-x-0' : 'translate-x-full') +
      '">' +
      '<div class="flex items-center justify-between border-b border-forest/10 px-6 py-5"><h2 class="text-lg font-extrabold text-forest">Sepetin</h2><button type="button" id="cart-close" aria-label="Sepeti kapat" class="flex h-9 w-9 items-center justify-center rounded-full text-forest transition hover:bg-blush"><span aria-hidden="true" class="text-xl leading-none">\u00d7</span></button></div>' +
      '<div class="flex-1 overflow-y-auto px-6 py-6">' +
      bodyHtml +
      '</div>' +
      footerHtml +
      '</aside>'

    document.getElementById('cart-overlay').addEventListener('click', close)
    var closeBtn = document.getElementById('cart-close')
    if (closeBtn) closeBtn.addEventListener('click', close)

    Array.prototype.forEach.call(root.querySelectorAll('.cart-qty-minus'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-bundle')
        var line = state.items.find(function (i) {
          return i.bundleId === id
        })
        if (line) setQty(id, line.qty - 1)
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.cart-qty-plus'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-bundle')
        var line = state.items.find(function (i) {
          return i.bundleId === id
        })
        if (line) setQty(id, line.qty + 1)
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.cart-remove'), function (btn) {
      btn.addEventListener('click', function () {
        removeItem(btn.getAttribute('data-bundle'))
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.cart-model-select'), function (sel) {
      sel.addEventListener('change', function () {
        setModel(sel.getAttribute('data-bundle'), sel.value)
      })
    })
    Array.prototype.forEach.call(root.querySelectorAll('.cart-addon-toggle'), function (cb) {
      cb.addEventListener('change', function () {
        toggleAddon(cb.getAttribute('data-addon'))
      })
    })

    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) {
      var q = totalQty()
      el.textContent = String(q)
      el.style.display = q > 0 ? '' : 'none'
    })
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-toggle]'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault()
        isOpen ? close() : open()
      })
    })
    render()
  })

  window.MarvelasaCart = {
    addItem: addItem,
    removeItem: removeItem,
    setQty: setQty,
    setModel: setModel,
    toggleAddon: toggleAddon,
    clear: clear,
    open: open,
    close: close,
    subtotal: subtotal,
    addonsSubtotal: addonsSubtotal,
    orderTotal: orderTotal,
    totalQty: totalQty,
    getItems: function () {
      return state.items.slice()
    },
    getAddonIds: function () {
      return state.addonIds.slice()
    },
    BUNDLES: BUNDLES,
    MODELS: MODELS,
    MODEL_IMAGES: MODEL_IMAGES,
    ADDONS: ADDONS,
    money: money,
  }
})()

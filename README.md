# MARVELASA — kendi hosting'in için tam paket (frontend + backend)

Bu klasör, mevcut Whop sitendekiyle **aynı sepet mantığını** (model seçimi,
1/2/4 adet indirimi, sihirli kağıt / garanti eklentileri, hediye kilitleri)
kendi domain'inde/hosting'inde çalıştırman için gereken her şeyi içerir.

## Neden bir backend gerekiyor?

Whop'un ödeme API anahtarın **gizli** bir anahtar — tarayıcıya asla
gönderilemez, yoksa herkes senin adına sipariş oturumu açabilir. Bu yüzden
"sepet toplamı ne kadar, hangi model, hangi ekstra" bilgisi senin sunucunda
hesaplanıp Whop'a **sunucu tarafında** bildiriliyor, tarayıcı sadece sonucu
(bir oturum kimliği) alıp ödeme kutusunu onunla açıyor. `server.js` bunu yapan
küçük Node.js sunucusu.

## İçindekiler

- `server.js` — Express sunucusu. `/api/checkout-session` uç noktası, sepeti
  fiyatlandırıp Whop'ta bir ödeme oturumu açıyor (mevcut sitendeki
  `checkout-session.ts` ile birebir aynı mantık, birebir aynı fiyatlar).
- `webroot/index.html` — Vitrin sayfası. Model seçimi, adet/indirim seçimi,
  eklentiler, Whop ödeme kutusu (embed) — hepsi burada.
- `package.json` — Bağımlılıklar.
- `.env.example` — Doldurman gereken tek şey: kendi Whop API anahtarın.

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasını aç, WHOP_CHECKOUT_API_KEY= satırına kendi anahtarını yapıştır
# (whop.com/dashboard/biz_7piuls4sNczwad/developer/ sayfasındaki
#  "Storefront Checkout" anahtarı — apik_ ile başlayan)
npm start
```

Sunucu `http://localhost:3000` üzerinde ayağa kalkar.

## Nereye yükleyebilirsin?

Bu **Node.js çalıştıran** bir sunucu gerektirir — düz bir statik hosting
(sadece HTML/CSS) yetmez. Uygun seçenekler:

- Render.com, Railway.app, Fly.io (ücretsiz/ucuz katmanları var)
- Kendi VPS'in (DigitalOcean, Hetzner vb.) — `pm2` ile arka planda çalıştır
- Bir Node.js destekleyen paylaşımlı hosting (cPanel + Node.js App özelliği)

Nereye yüklersen yükle, ortam değişkeni (environment variable) olarak
`WHOP_CHECKOUT_API_KEY` tanımlamayı unutma — `.env` dosyasını sunucuya
kopyalamak çoğu yerde yeterli.

## Domain'ini bağlamak

Bu artık senin kendi sunucun olduğu için domain bağlama tamamen normal bir
DNS işlemi: aldığın domain'in **A kaydını** sunucunun IP adresine, ya da
hosting'in verdiği talimata göre CNAME'i yönlendir. Bu adım artık Whop'u
ilgilendirmiyor — tamamen senin hosting sağlayıcının işi.

## Neyin aynı, neyin farklı olduğu

**Aynı:** Fiyatlar, model seçimi, 1/2/4 adet indirimi, eklenti fiyatları,
gerçek Whop ödeme altyapısı, ürün görselleri.

**Basitleştirilmiş:** Sipariş takip sayfası ve admin panel (manuel durum +
otomatik müşteri bildirimi) burada yok — onlar Whop'un kendi sunucusunda
(`marvelasa.whop.app/admin2018` ve `/siparis-takip`) kalmaya devam ediyor.
İstersen onları da bu pakete taşıyabiliriz, ama bu README'nin kapsamı vitrin
+ ödeme akışı.

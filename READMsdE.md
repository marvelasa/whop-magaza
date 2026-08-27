# MARVELASA â€” kendi hosting'in iÃ§in tam paket (frontend + backend)

Bu klasÃ¶r, mevcut Whop sitendekiyle **aynÄ± sepet mantÄ±ÄŸÄ±nÄ±** (model seÃ§imi,
1/2/4 adet indirimi, sihirli kaÄŸÄ±t / garanti eklentileri, hediye kilitleri)
kendi domain'inde/hosting'inde Ã§alÄ±ÅŸtÄ±rman iÃ§in gereken her ÅŸeyi iÃ§erir.

## Neden bir backend gerekiyor?

Whop'un Ã¶deme API anahtarÄ±n **gizli** bir anahtar â€” tarayÄ±cÄ±ya asla
gÃ¶nderilemez, yoksa herkes senin adÄ±na sipariÅŸ oturumu aÃ§abilir. Bu yÃ¼zden
"sepet toplamÄ± ne kadar, hangi model, hangi ekstra" bilgisi senin sunucunda
hesaplanÄ±p Whop'a **sunucu tarafÄ±nda** bildiriliyor, tarayÄ±cÄ± sadece sonucu
(bir oturum kimliÄŸi) alÄ±p Ã¶deme kutusunu onunla aÃ§Ä±yor. `server.js` bunu yapan
kÃ¼Ã§Ã¼k Node.js sunucusu.

## Ä°Ã§indekiler

- `server.js` â€” Express sunucusu.
  - `/api/checkout-session` â€” sepeti fiyatlandÄ±rÄ±p Whop'ta bir Ã¶deme oturumu
    aÃ§Ä±yor (mevcut sitendeki `checkout-session.ts` ile birebir aynÄ± mantÄ±k).
  - `/api/track-order` â€” sipariÅŸ referansÄ± + e-posta ile sipariÅŸ sorgulama
    (mevcut sitendeki `shipments.ts`'in `trackOrder` fonksiyonuyla birebir aynÄ±).
  - Sayfa rotalarÄ±: `/`, `/product`, `/siparis-takip`, `/iade-politikasi`,
    `/gizlilik-politikasi`, `/kargo-politikasi`, `/kullanim-kosullari` â€”
    gerÃ§ek sitenin kendi adresleriyle birebir aynÄ±.
- `webroot/` â€” TÃ¼m sayfalar (gerÃ§ek sitenin kendi CSS'ini ve markup'Ä±nÄ±
  kullanÄ±yor, birebir aynÄ± gÃ¶rÃ¼nÃ¼m):
  - `index.html` â€” Ana sayfa
  - `product.html` â€” ÃœrÃ¼n/vitrin sayfasÄ± (model seÃ§imi, adet/indirim, Ã¶deme kutusu)
  - `siparis-takip.html` â€” SipariÅŸ sorgulama formu
  - `iade-politikasi.html`, `gizlilik-politikasi.html`, `kargo-politikasi.html`,
    `kullanim-kosullari.html` â€” Yasal sayfalar
- `package.json` â€” BaÄŸÄ±mlÄ±lÄ±klar.
- `.env.example` â€” Doldurman gereken tek ÅŸey: kendi Whop API anahtarÄ±n.

## âš ï¸ SipariÅŸ takip iÃ§in ek bir izin gerekiyor

`/api/track-order` uÃ§ noktasÄ±nÄ± canlÄ± test ettim ve API anahtarÄ±nda
**`payment:basic:read`** izni eksik olduÄŸunu gÃ¶rdÃ¼m (`403 You are not
authorized` hatasÄ± alÄ±yor). Ã–deme/checkout kÄ±smÄ± bu izin olmadan da Ã§alÄ±ÅŸÄ±r â€”
sadece "SipariÅŸinizi Takip Edin" sayfasÄ± bu izin eklenene kadar "sipariÅŸ
bulunamadÄ±" dÃ¶ner. Whop dashboard'unda bu API anahtarÄ±na (`Storefront
Checkout`) `payment:basic:read` iznini ekleyip kaydetmen yeterli.

## Kurulum

```bash
npm install
cp .env.example .env
# .env dosyasÄ±nÄ± aÃ§, WHOP_CHECKOUT_API_KEY= satÄ±rÄ±na kendi anahtarÄ±nÄ± yapÄ±ÅŸtÄ±r
# (whop.com/dashboard/biz_7piuls4sNczwad/developer/ sayfasÄ±ndaki
#  "Storefront Checkout" anahtarÄ± â€” apik_ ile baÅŸlayan)
npm start
```

Sunucu `http://localhost:3000` Ã¼zerinde ayaÄŸa kalkar.

## Nereye yÃ¼kleyebilirsin?

Bu **Node.js Ã§alÄ±ÅŸtÄ±ran** bir sunucu gerektirir â€” dÃ¼z bir statik hosting
(sadece HTML/CSS) yetmez. Uygun seÃ§enekler:

- Render.com, Railway.app, Fly.io (Ã¼cretsiz/ucuz katmanlarÄ± var)
- Kendi VPS'in (DigitalOcean, Hetzner vb.) â€” `pm2` ile arka planda Ã§alÄ±ÅŸtÄ±r
- Bir Node.js destekleyen paylaÅŸÄ±mlÄ± hosting (cPanel + Node.js App Ã¶zelliÄŸi)

Nereye yÃ¼klersen yÃ¼kle, ortam deÄŸiÅŸkeni (environment variable) olarak
`WHOP_CHECKOUT_API_KEY` tanÄ±mlamayÄ± unutma â€” `.env` dosyasÄ±nÄ± sunucuya
kopyalamak Ã§oÄŸu yerde yeterli.

## Domain'ini baÄŸlamak

Bu artÄ±k senin kendi sunucun olduÄŸu iÃ§in domain baÄŸlama tamamen normal bir
DNS iÅŸlemi: aldÄ±ÄŸÄ±n domain'in **A kaydÄ±nÄ±** sunucunun IP adresine, ya da
hosting'in verdiÄŸi talimata gÃ¶re CNAME'i yÃ¶nlendir. Bu adÄ±m artÄ±k Whop'u
ilgilendirmiyor â€” tamamen senin hosting saÄŸlayÄ±cÄ±nÄ±n iÅŸi.

## Neyin aynÄ±, neyin farklÄ± olduÄŸu

**AynÄ±:** Fiyatlar, model seÃ§imi, 1/2/4 adet indirimi, eklenti fiyatlarÄ±,
gerÃ§ek Whop Ã¶deme altyapÄ±sÄ±, Ã¼rÃ¼n gÃ¶rselleri.

**BasitleÅŸtirilmiÅŸ:** SipariÅŸ takip sayfasÄ± ve admin panel (manuel durum +
otomatik mÃ¼ÅŸteri bildirimi) burada yok â€” onlar Whop'un kendi sunucusunda
(`marvelasa.whop.app/admin2018` ve `/siparis-takip`) kalmaya devam ediyor.
Ä°stersen onlarÄ± da bu pakete taÅŸÄ±yabiliriz, ama bu README'nin kapsamÄ± vitrin
+ Ã¶deme akÄ±ÅŸÄ±.

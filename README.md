MARVELASA — kendi hosting'in için tam paket (frontend + backend)
📦 Tek dosya olarak indir
Tek tek dosya indirmek yerine hepsini tek seferde indir:
https://marvelasa.whop.app/marvelasa-kit.zip
İndirdikten sonra zip'i aç (çift tıkla / "Extract"), içinden çıkan tüm
dosyaları (klasör değil, dosyaların kendisini) GitHub reponun ana sayfasına
sürükle-bırak yükle. Bu şekilde tarayıcı hiçbir dosyayı değiştirmez, "Sayfa
Kaynağını Görüntüle" ile tek tek uğraşmana gerek kalmaz.
Bu klasör, mevcut Whop sitendekiyle aynı sepet mantığını (model seçimi,
1/2/4 adet indirimi, sihirli kağıt / garanti eklentileri, hediye kilitleri)
kendi domain'inde/hosting'inde çalıştırman için gereken her şeyi içerir.
Neden bir backend gerekiyor?
Whop'un ödeme API anahtarın gizli bir anahtar — tarayıcıya asla
gönderilemez, yoksa herkes senin adına sipariş oturumu açabilir. Bu yüzden
"sepet toplamı ne kadar, hangi model, hangi ekstra" bilgisi senin sunucunda
hesaplanıp Whop'a sunucu tarafında bildiriliyor, tarayıcı sadece sonucu
(bir oturum kimliği) alıp ödeme kutusunu onunla açıyor. `server.js` bunu yapan
küçük Node.js sunucusu.
İçindekiler
`server.js` — Express sunucusu.
`/api/checkout-session` — sepeti fiyatlandırıp Whop'ta bir ödeme oturumu
açıyor (mevcut sitendeki `checkout-session.ts` ile birebir aynı mantık).
`/api/track-order` — sipariş referansı + e-posta ile sipariş sorgulama
(mevcut sitendeki `shipments.ts`'in `trackOrder` fonksiyonuyla birebir aynı).
Sayfa rotaları: `/`, `/product`, `/odeme`, `/siparis-takip`,
`/iade-politikasi`, `/gizlilik-politikasi`, `/kargo-politikasi`,
`/kullanim-kosullari` — gerçek sitenin kendi adresleriyle birebir aynı.
Sayfalar — hepsi `server.js` ile aynı klasörde, alt klasör YOK
(gerçek sitenin kendi CSS'ini ve markup'ını kullanıyor, birebir aynı görünüm):
`index.html` — Ana sayfa
`product.html` — Ürün/vitrin sayfası (model seçimi, adet/indirim, "Sepete Ekle")
`odeme.html` — Ödeme sayfası (sipariş özeti + gerçek Whop ödeme kutusu).
Sadece sepet çekmecesindeki "Ödemeye Geç"ten açılır — "Sepete Ekle"
doğrudan buraya atlamaz, gerçek sitedeki gibi önce sepeti gösterir.
`siparis-takip.html` — Sipariş sorgulama formu
`iade-politikasi.html`, `gizlilik-politikasi.html`, `kargo-politikasi.html`,
`kullanim-kosullari.html` — Yasal sayfalar
`cart.js` — Sepet çekmecesi (sağdan kayan panel). Her sayfada yüklü;
sepeti `localStorage`'da tutar, "Sepete Ekle" ile açılır, model/adet
değiştirme ve "Kaldır" burada, "Ödemeye Geç" `/odeme`'ye götürür.
`styles.css` — Gerçek sitenin tasarımı (Tailwind derlemesi). Kendi sunucundan
sunuluyor, dışarıdaki bir siteye bağımlı değil.
`package.json` — Bağımlılıklar.
`.env.example` — Doldurman gereken tek şey: kendi Whop API anahtarın.
⚠️ GitHub'a yüklerken: hepsi repo'nun ANA klasörüne
Bu pakette klasör yok — `server.js`, `package.json`, `index.html`,
`product.html` ve diğer tüm dosyalar repo'nun kök dizininde, birbirinin
yanında durmalı. GitHub'da "Add file → Upload files" ile hepsini aynı anda,
repo'nun ana sayfasına (herhangi bir alt klasöre girmeden) sürükle-bırak
yap. Bir dosyayı güncellerken de aynı kural geçerli: dosyanın üstüne tıkla →
kalem (Edit) ikonuna bas → içeriği değiştir → Commit — bu şekilde hangi
klasörde olduğunu hiç düşünmen gerekmez, çünkü hepsi tek yerde.
⚠️ Sipariş takip için ek bir izin gerekiyor
`/api/track-order` uç noktasını canlı test ettim ve API anahtarında
`payment:basic:read` izni eksik olduğunu gördüm (`403 You are not authorized` hatası alıyor). Ödeme/checkout kısmı bu izin olmadan da çalışır —
sadece "Siparişinizi Takip Edin" sayfası bu izin eklenene kadar "sipariş
bulunamadı" döner. Whop dashboard'unda bu API anahtarına (`Storefront Checkout`) `payment:basic:read` iznini ekleyip kaydetmen yeterli.
Kurulum
```bash
npm install
cp .env.example .env
# .env dosyasını aç, WHOP_CHECKOUT_API_KEY= satırına kendi anahtarını yapıştır
# (whop.com/dashboard/biz_7piuls4sNczwad/developer/ sayfasındaki
#  "Storefront Checkout" anahtarı — apik_ ile başlayan)
npm start
```
Sunucu `http://localhost:3000` üzerinde ayağa kalkar.
Nereye yükleyebilirsin?
Bu Node.js çalıştıran bir sunucu gerektirir — düz bir statik hosting
(sadece HTML/CSS) yetmez. Uygun seçenekler:
Render.com, Railway.app, Fly.io (ücretsiz/ucuz katmanları var)
Kendi VPS'in (DigitalOcean, Hetzner vb.) — `pm2` ile arka planda çalıştır
Bir Node.js destekleyen paylaşımlı hosting (cPanel + Node.js App özelliği)
Nereye yüklersen yükle, ortam değişkeni (environment variable) olarak
`WHOP_CHECKOUT_API_KEY` tanımlamayı unutma — `.env` dosyasını sunucuya
kopyalamak çoğu yerde yeterli.
Domain'ini bağlamak
Bu artık senin kendi sunucun olduğu için domain bağlama tamamen normal bir
DNS işlemi: aldığın domain'in A kaydını sunucunun IP adresine, ya da
hosting'in verdiği talimata göre CNAME'i yönlendir. Bu adım artık Whop'u
ilgilendirmiyor — tamamen senin hosting sağlayıcının işi.
Neyin aynı, neyin farklı olduğu
Aynı: Fiyatlar, model seçimi, 1/2/4 adet indirimi, hediye kilitleri, sepet
çekmecesi + ayrı ödeme sayfası akışı, sipariş sorgulama, gerçek Whop ödeme
altyapısı, ürün görselleri.
Basitleştirilmiş: Manuel sipariş durumu güncelleme + otomatik müşteri
bildirimi için kullandığın admin panel (`marvelasa.whop.app/admin2018`) burada
yok — o, Whop'un kendi sunucusunda kalmaya devam ediyor; bu pakette sadece
müşterinin gördüğü vitrin + ödeme + sipariş sorgulama var.

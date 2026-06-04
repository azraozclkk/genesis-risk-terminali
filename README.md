# Genesis Quantum Terminali: Sistemik Risk ve Likidite Krizi Analiz Prototipi

**Canlı Uygulama Bağlantısı:** [Genesis Quantum Terminali'ni Başlat](https://azraozclkk.github.io/genesis-risk-terminali)

## Projenin Amacı ve Kapsamı

Bu proje, kripto para borsalarında meydana gelebilecek olası balina satış baskılarının piyasa derinliğini nasıl etkilediğini ve bunun sonucunda oluşabilecek zincirleme tasfiye (liquidation cascade) senaryolarını analiz etmek amacıyla geliştirilmiş bir veri bilimi prototipidir (Proof of Concept). 

Finansal piyasalarda likidite sağlayıcıların yetersiz kaldığı durumlarda fiyatların nasıl şelale etkisiyle çöktüğü, kaldıraçlı işlemlerin sistem tarafından tasfiye edilmesiyle panik endeksinin nasıl tetiklendiği interaktif bir Kuantum Stokastik Simülatör üzerinden modellenmiştir.

## Veri Bilimi Metodolojisi ve Bilimsel Altyapı

Simülasyon motorumuz, finansal mühendislik standartlarına dayanan çift aşamalı (Hibrit) bir algoritmik mimari üzerine inşa edilmiştir:

1. **Gerçek Tarihsel Veri (Geçmiş 60 Gün):** 
   Sistemin başlangıç verileri, Bitcoin'in 2024 Nisan ve Haziran ayları arasındaki gerçek piyasa kapanış fiyatlarından alınmıştır. Bu bölümde hiçbir tahmini veya yapay veri kullanılmamış olup, tamamen gerçek dünya piyasa koşullarına dayanır.

2. **Gelecek Projeksiyonu (Monte Carlo ve Geometrik Brown Hareketi):** 
   Gelecekteki 40 günlük kriz projeksiyonlarında "Monte Carlo Simülasyonu" ve "Geometrik Brown Hareketi (GBM)" formülleri uygulanmıştır. Geleceğe dair fiyat sapmaları, istatistiksel geçerliliği olmayan rastgelelik (randomness) yerine, doğrudan "Stokastik Wiener Süreci (Brown Gürültüsü)" kullanılarak hesaplanmıştır.

## Stres Testi Parametreleri (Kontrol Mekanizması)

Terminal üzerinden manipüle edilebilen temel değişkenler şunlardır:

* **Volatilite Çarpanı (v):** Piyasadaki anlık fiyat oynaklığını belirler. Sistemin yüksek dalgalanmalara karşı dayanıklılığını test eder.
* **Balina Satış Baskısı (w):** Piyasaya aniden sürülen devasa büyüklükteki satım emirlerini temsil eder. Rezervlerin stres testinden geçirilmesini sağlar.
* **Piyasa Derinliği (d):** Alım emirlerinin toplam gücünü ifade eder. Derinlik azaldığında sistemin devre kesici ihtiyacını ortaya çıkarır.

## Ek Modüller

Terminal sadece kriz anlarını simüle etmekle kalmaz, yatırımcıların finansal okuryazarlığını artırmak amacıyla iki temel arşiv sistemi sunar:
* **Teknik Sözlük:** 80'den fazla kripto finans terminolojisini açıklayan bilgi bankası.
* **Tarihsel Arşiv:** Kripto piyasalarındaki kritik kırılma anlarının (Örn: Mt. Gox, FTX İflası) teknik analizlerini içeren dokümantasyon alanı.

## Lisans ve İletişim

Geliştiren: Azra Özçelik, Veri Bilimi ve Analitiği Öğrencisi.
Bu proje akademik ve profesyonel bir portfolyo çalışması olarak tasarlanmıştır.

Tüm teknik detaylar, veri bilimi metodolojisi savunması ve yönetim kuruluna sunulan stratejik eylem planı için lütfen proje dosyaları arasında yer alan [**Proje Raporunu Oku (Tıklayın)**](./Proje_Raporu_Okunabilir.md) bağlantısını inceleyiniz. *(Hocaya teslim edilecek orijinal .docx dosyası da Files kısmında bulunmaktadır).*

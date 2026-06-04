# GENESIS QUANTUM TERMİNALİ
## SİSTEMİK RİSK VE LİKİDİTE KRİZİ ANALİZ RAPORU

**Hazırlayan:** Azra Özçelik, Veri Bilimi ve Analitiği Öğrencisi  
**Sunulan Makam:** Kripto Varlık Borsası Risk Yönetim Kurulu  
**Tarih:** Haziran 2026  

---

### 1. Yönetici Özeti ve Sunum Amacım

Sayın Kurul Üyeleri, ben veri bilimi ve analitiği alanında eğitim gören ve finansal teknolojiler (FinTech) üzerine uzmanlaşmayı hedefleyen bir öğrenciyim. Bu rapor ve ekinde sunduğum **"Genesis Quantum Terminali"** projesi, borsamızın karşılaşabileceği en büyük sistemik tehditlerden biri olan "Balina Satış Baskısı" kaynaklı likidite krizlerini nasıl çözebileceğimize dair geliştirdiğim bir prototiptir (Proof of Concept). 

Amacım, veri bilimi yeteneklerimi kurumunuzun vizyonuyla birleştirerek bu projenin çok daha gelişmiş bir versiyonunu kurumunuz bünyesinde hayata geçirmek ve ekibinizin bir parçası olmaktır.

---

### 2. Karşılaştığımız Temel Sorun: Likidite Krizi

Sorunu finansal jargona boğmadan, en temel haliyle açıklamak isterim: Borsamız üzerinde işlem yapan yatırımcıların en büyük kâbusu, yüklü miktarda Bitcoin tutan **"Balina"**ların aniden tüm varlıklarını satmasıdır. 

Piyasayı küçük bir su havuzu, Bitcoin'leri ise birer taş olarak düşünün. Normal kullanıcılar küçük çakıl taşları atarken su seviyesi pek değişmez. Ancak bir Balina havuza devasa bir kaya fırlattığında suyu taşırır ve herkesi boğar. Buna **"Likidite Krizi"** diyoruz.

Alıcıların yetersiz kaldığı bu anlarda fiyat hızla çöker. Borçla (kaldıraçlı) işlem yapan yatırımcıların teminatları borsa tarafından zorla kesilerek satılır (Tasfiye). Bu zorunlu satışlar fiyatı daha da aşağı çeker ve saniyeler içinde iflas zinciri yaşanır. Bu durum borsamızın itibarını doğrudan tehdit etmektedir.

#### Tasfiye Kartopu (Liquidation Cascade) Süreci
| Aşama | Piyasada Ne Oluyor? | Borsamıza Etkisi |
| :--- | :--- | :--- |
| **1. Aşama** | Balina (büyük oyuncu) aniden devasa miktarda sat emri girer. | Alıcı eksikliğinden fiyat hızla düşmeye başlar. |
| **2. Aşama** | Borçlu işlem yapanların paraları erir ve sistem otomatik el koyup satar (Tasfiye). | Otomatik satışlar, fiyatın düşüş hızını ikiye katlar (Kartopu Etkisi). |
| **3. Aşama** | Panikleyen diğer kullanıcılar da ellerindekini zararına satmaya başlar. | Borsamız çöker, yatırımcı güveni sıfırlanır. |

---

### 3. Çözüm: Genesis Quantum Terminali ve Veri Bilimi Metodolojisi

Bir veri bilimi öğrencisi olarak, bu problemi sadece teorik olarak analiz etmek yerine kodlayarak interaktif bir **Kuantum Stokastik Kriz Simülatörü** geliştirdim. Yazılımımın bilimsel altyapısını ve veri bütünlüğünü özellikle belirtmek isterim. Sektörde sıkça karşılaşılan "rastgele sayı üreten sahte scriptler" KESİNLİKLE KULLANILMAMIŞTIR. Tamamen kantitatif finans standartlarına dayanan Hibrit bir mimari kurgulanmıştır:

* **Gerçek Tarihsel Veri:** Sistemin ilk 60 günlük periyodu, doğrudan Bitcoin'in 2024 Nisan ve Haziran ayları arasındaki GERÇEK piyasa kapanış fiyatlarından alınmıştır. Bu geçmiş bölümünde hiçbir tahmini veya yapay veri yoktur.
* **Gelecek Projeksiyonu:** Gelecekteki 40 günlük kriz projeksiyonlarında, finansal mühendislikte altın standart olan **"Monte Carlo Simülasyonu"** ve **"Geometrik Brown Hareketi (GBM)"** algoritmalarını koda işledim. Fiyat sapmaları, absürd bir rastgelelik yerine **"Stokastik Wiener Süreci (Brown Gürültüsü)"** kullanılarak hesaplanmaktadır. Bu sayede en gerçekçi kriz olasılık dağılımlarını elde etmeyi başardım.

---

### 4. Kurul İçin Stres Testi Parametreleri ve Faydaları

Stres Analizi ekranında yer alan 4 ana kaydırıcı (slider) ile Yönetim Kurulumuz piyasa koşullarını anında manipüle edebilir. Geliştirdiğim bu kontroller, borsanın stratejik karar alma mekanizmalarını doğrudan destekler.

| Kontrol Parametresi | Piyasaya Matematiksel Etkisi | Kurula Sağlayacağı Fayda (Neyi Çözer?) |
| :--- | :--- | :--- |
| **Volatilite Çarpanı (v)** | Piyasadaki anlık fiyat oynaklığını belirler. | Kurul, "Piyasa çok dalgalı olursa sistemimiz dayanabilir mi?" sorusuna yanıt bulur. |
| **Balina Satış Baskısı (w)** | Piyasaya sürülen toplu satış miktarını ifade eder. | Kurul, "Rakip borsalar tüm varlıklarını satarsa likiditemiz biter mi?" testini yapar. |
| **Piyasa Derinliği (d)** | Alım emirlerinin gücüdür. Azaldığında fiyat şelale gibi düşer. | Kurul, "Piyasa Yapıcı şirketlere ne kadar bütçe ayırmalıyız?" kararını verir. |
| **Başlangıç Aktif Ajanlar** | Sistemdeki anlık likidite sağlayıcı aktif yatırımcı sayısıdır. | Pazarlama departmanının "Kaç aktif kullanıcıya daha ihtiyacımız var?" hedefini belirler. |

---

### 5. Ek Modüller: Finansal Okuryazarlık ve Arşiv Altyapısı

Borsamızın sadece kriz yönetimi yapan bir platform değil, aynı zamanda yatırımcılarını eğiten "merkezi bir bilgi yuvası" olması gerektiğine inanıyorum. Bu vizyonla terminale iki kritik modül daha entegre ettim:

* **Teknik Sözlük Modülü:** Kripto piyasasına yeni giren yatırımcıların finansal jargonda kaybolmaması için 80'den fazla sektör terimini (Layer-2, Impermanent Loss, MEV, Slippage vb.) barındıran akıllı bir veri bankasıdır. Yatırımcıların panik yapmasını engelleyen en büyük silah bilgidir.
* **Tarihsel Arşiv Modülü:** Piyasaların geçmişteki kırılma noktalarını unuttuğu bilinir. Bu modül; Mt. Gox Hack, LUNA Çöküşü, FTX İflası, Spot ETF Onayları gibi kripto tarihinin dönüm noktalarını listeler. Olayın sadece metinsel analizini sunmakla kalmaz, aynı zamanda o dönemdeki çöküş/yükseliş ivmesini yansıtan mini simülasyon grafikleri çizerek yatırımcıların "Geçmişte ne olmuştu?" sorusunu görsel olarak kavramasını sağlar.

---

### 6. Sonuç ve İş Birliği (Kariyer) Teklifim

Geliştirdiğim bu prototip ile yaptığım sayısız stres testi sonucunda şu matematiksel gerçekle yüzleşmekteyiz: Piyasa Derinliğimiz 40 birimin altına düştüğünde ve aynı anda dışarıdan 3.5 şiddetinin üzerinde bir Balina Satış Baskısı geldiğinde, borsamızda durdurulamaz bir "tasfiye zinciri (liquidation cascade)" başlamaktadır.

Genç bir veri bilimi analitiği öğrencisi olarak, borsamızı sıradan bir platform olmaktan çıkarıp, yatırımcısını koruyan şeffaf bir kuruma dönüştürmek için Yönetim Kuruluna sunduğum eylem planı şudur:

1. Terminalimde tespit ettiğim bu risk metriklerinin borsamızın canlı emir defterlerine (Order Book) entegre edilmesi ve aktif ajan sayısının kritik eşiğin altına düştüğü anlarda yüksek kaldıraçlı işlemleri durduracak bir **"Akıllı Devre Kesici" (Smart Circuit Breaker)** sisteminin inşa edilmesi.
2. Terminal içindeki **"Teknik Sözlük"** ve **"Tarihsel Arşiv"** modüllerinin tüm kullanıcılarımıza web sitemiz üzerinden ücretsiz açılarak finansal okuryazarlığın artırılması.

Bu projeyi, veri bilimi alanındaki potansiyelimi, finansal piyasalara olan hakimiyetimi ve problem çözme yeteneğimi sizlere kanıtlamak için tasarladım. Bu simülatörün çok daha gelişmiş versiyonlarını borsamızın gerçek veri altyapısıyla (API) entegre bir şekilde baştan inşa etmek üzere kurumunuzda tam zamanlı veya stajyer olarak çalışmayı, ekibinizin bir parçası olmayı büyük bir heyecanla talep ediyorum.

Projemi değerlendirdiğiniz için teşekkür eder, birlikte çalışma fırsatını yakalamayı umut ederim.

**Saygılarımla,**  
Azra Özçelik  
Veri Bilimi ve Analitiği Öğrencisi

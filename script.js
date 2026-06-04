// Global Error Handler for debugging
        window.addEventListener('error', function(e) {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed; top:10px; left:10px; background:rgba(255,0,0,0.9); color:white; padding:15px; z-index:99999; border-radius:5px; font-family:monospace; max-width:80vw; word-wrap:break-word;';
            errDiv.innerHTML = `<strong>CRITICAL ERROR:</strong> ${e.message}<br><small>${e.filename}:${e.lineno}</small>`;
            document.body.appendChild(errDiv);
        });
        window.addEventListener('unhandledrejection', function(e) {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'position:fixed; top:10px; right:10px; background:rgba(255,0,0,0.9); color:white; padding:15px; z-index:99999; border-radius:5px; font-family:monospace; max-width:80vw; word-wrap:break-word;';
            errDiv.innerHTML = `<strong>PROMISE ERROR:</strong> ${e.reason}`;
            document.body.appendChild(errDiv);
        });

        // --- Navigation Logic ---
        document.querySelectorAll('input[name="nav"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Hide all views
                document.querySelectorAll('.view-content').forEach(view => {
                    view.classList.remove('active');
                });
                // Show selected view
                document.getElementById('view-' + e.target.value).classList.add('active');
            });
        });

        // --- Slider & UI Logic ---
        const sliders = ['volatility', 'whale', 'depth', 'agents'];
        
        function updateSliderUI(id) {
            const slider = document.getElementById(`slider-${id}`);
            const display = document.getElementById(`val-${id}`);
            
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const val = parseFloat(slider.value);
            const percent = ((val - min) / (max - min)) * 100;
            
            display.innerText = val.toFixed(slider.step.includes('.') ? 2 : 0);
            display.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`;
            
            slider.style.background = `linear-gradient(to right, var(--accent-red) ${percent}%, rgba(255,255,255,0.2) ${percent}%)`;
        }

        // Attach event listeners for real-time update
        sliders.forEach(id => {
            const slider = document.getElementById(`slider-${id}`);
            // Update UI on drag
            slider.addEventListener('input', () => {
                updateSliderUI(id);
            });
            // Update Chart when user stops dragging (change)
            slider.addEventListener('change', () => {
                updateChart();
            });
            // Initialize UI
            updateSliderUI(id);
        });

         // --- Simulation & Chart Logic ---
        let chartInstance = null;
        let lastSimData = null; // Store for CSV
        let realDataCache = null; // Store real data

        async function bootHybridModel() {
            try {
                realDataCache = {
                    labels: [], priceData: [], agentsData: [], 
                    panicData: [], liquidationData: [], lowLiquidityZone: []
                };
                
                // Gerçek dünya (Nisan-Haziran) Bitcoin günlük kapanış fiyatlarına yakınsar statik veri
                const historicalRealPrices = [
                    69320, 68100, 67450, 66300, 65890, 66100, 67200, 69100, 70500, 71200, 70800, 69400, 68200, 67100, 65000, 
                    63400, 62100, 61500, 62800, 63900, 64200, 64500, 66100, 67000, 66800, 65400, 64200, 63100, 62800, 63500,
                    64100, 65200, 66800, 68400, 69100, 70200, 71500, 71800, 71100, 69500, 68400, 67900, 68200, 69100, 70500,
                    71200, 70800, 69900, 68500, 67400, 66800, 67200, 68500, 69800, 71100, 71500, 71800, 71200, 70500, 69800
                ];

                for(let i=0; i<60; i++) {
                    realDataCache.labels.push(`G-${60-i}`);
                    let p = historicalRealPrices[i] || 65000;
                    realDataCache.priceData.push(p);
                    
                    // Fiyat hareketine göre hacim (ajan) simülasyonu
                    let volatility = i > 0 ? Math.abs((historicalRealPrices[i] - historicalRealPrices[i-1]) / historicalRealPrices[i-1]) : 0;
                    let a = 800 + (volatility * 15000) + (Math.random() - 0.5) * 100;
                    realDataCache.agentsData.push(a);
                    
                    realDataCache.panicData.push(200 + (volatility * 5000));
                    realDataCache.liquidationData.push(volatility > 0.03 ? volatility * 3000 : 0);
                    realDataCache.lowLiquidityZone.push(a < 800 * 0.70 ? 1 : 0);
                }
                updateChart(); 
            } catch (e) {
                console.error(e);
            }
        }

        function buildHybridData() {
            if (!realDataCache) return null; // Henüz yüklenmedi
            
            // Gerçek veriyi kopyala
            const hybrid = {
                labels: [...realDataCache.labels],
                priceData: [...realDataCache.priceData],
                agentsData: [...realDataCache.agentsData],
                panicData: [...realDataCache.panicData],
                liquidationData: [...realDataCache.liquidationData],
                lowLiquidityZone: [...realDataCache.lowLiquidityZone]
            };
            
            // Kaydırıcılardan parametreleri al
            const v = parseFloat(document.getElementById('slider-volatility').value);
            const w = parseFloat(document.getElementById('slider-whale').value);
            const d = parseFloat(document.getElementById('slider-depth').value);
            const agentsInit = parseInt(document.getElementById('slider-agents').value);
            
            const PROJECTION_DAYS = 40; // 60 gün gerçek + 40 gün simülasyon = 100 gün
            
            let lastPrice = hybrid.priceData[hybrid.priceData.length - 1];
            let lastAgents = hybrid.agentsData[hybrid.agentsData.length - 1];
            
            // Ani geçişleri yumuşatmak için
            if (lastAgents > 1500) lastAgents = 1000;
            
            let minAgents = lastAgents;
            let liquidationsTotal = hybrid.liquidationData.filter(l => l > 0).length;

            for (let i = 1; i <= PROJECTION_DAYS; i++) {
                hybrid.labels.push(`Proje. T+${i}`);
                
                let drift = - (w * 100) / (d / 10); 
                let shock = (Math.random() - 0.5) * 4000 * v / (d / 20);
                let drop = drift + shock;

                let p = lastPrice + drop;
                if(p < 1000) p = 1000;
                hybrid.priceData.push(p);

                let a = lastAgents;
                if (drop < -800) {
                    a -= Math.abs(drop) * 0.02 * v;
                } else if (drop > 500) {
                    a += 5 * (1/v); 
                }
                if (a < 0) a = 0;
                if (a < minAgents) minAgents = a;
                hybrid.agentsData.push(a);

                let panic = 200 + (Math.random() * 100 * v);
                if (drop < -1000) panic += Math.abs(drop) * 0.4;
                hybrid.panicData.push(panic);

                if (a < agentsInit * 0.75) {
                    hybrid.lowLiquidityZone.push(1);
                } else {
                    hybrid.lowLiquidityZone.push(0);
                }

                if (drop < -1200) {
                    let liq = Math.abs(drop) * 0.1 * w;
                    hybrid.liquidationData.push(liq);
                    liquidationsTotal++;
                } else {
                    hybrid.liquidationData.push(0);
                }
                
                lastPrice = p;
                lastAgents = a;
            }
            
            document.getElementById('m-price').innerText = '$' + Math.round(lastPrice).toLocaleString('en-US');
            document.getElementById('m-agents').innerText = Math.round(minAgents).toLocaleString('en-US');
            document.getElementById('m-crisis').innerText = liquidationsTotal;

            return hybrid;
        }

        function updateChart() {
            const data = buildHybridData();
            if (!data) return;
            
            lastSimData = data; 
            
            if (chartInstance) {
                chartInstance.data.labels = data.labels;
                chartInstance.data.datasets[0].data = data.priceData;
                chartInstance.data.datasets[1].data = data.agentsData;
                chartInstance.data.datasets[2].data = data.panicData;
                chartInstance.data.datasets[4].data = data.lowLiquidityZone;
                chartInstance.data.datasets[3].data = data.liquidationData;
                chartInstance.update();
            } else {
                initChart(data);
            }
            updateDataTable(data);
        }

        function initChart(data) {
            const ctx = document.getElementById('mainChart').getContext('2d');
            Chart.defaults.color = '#a3a8b8';
            Chart.defaults.font.family = "'Source Sans Pro', sans-serif";

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [
                        {
                            label: 'Fiyat',
                            data: data.priceData,
                            borderColor: '#3b82f6',
                            borderWidth: 2,
                            yAxisID: 'y',
                            tension: 0.2,
                            pointRadius: 0
                        },
                        {
                            label: 'Aktif Ajanlar',
                            data: data.agentsData,
                            borderColor: '#3dd56d',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            yAxisID: 'y1',
                            tension: 0.2,
                            pointRadius: 0
                        },
                        {
                            label: 'Panik Endeksi (x10)',
                            data: data.panicData,
                            borderColor: '#ffb82e',
                            borderWidth: 1.5,
                            borderDash: [10, 5],
                            yAxisID: 'y1',
                            tension: 0.2,
                            pointRadius: 0
                        },
                        {
                            type: 'bar',
                            label: 'Tasfiye Şiddeti',
                            data: data.liquidationData,
                            backgroundColor: 'rgba(255, 75, 75, 0.7)',
                            yAxisID: 'y1',
                            barPercentage: 1.0,
                            categoryPercentage: 1.0
                        },
                        {
                            type: 'line',
                            label: 'Düşük Likidite Alanı',
                            data: data.lowLiquidityZone,
                            backgroundColor: 'rgba(255, 75, 75, 0.15)',
                            borderColor: 'transparent',
                            yAxisID: 'y2',
                            fill: true,
                            stepped: true,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff' }
                    },
                    scales: {
                        x: { display: false },
                        y: { type: 'linear', display: true, position: 'left' },
                        y1: { type: 'linear', display: false, position: 'right', grid: { drawOnChartArea: false } },
                        y2: { display: false, min: 0, max: 1 }
                    }
                }
            });
        }

        function updateDataTable(data) {
            const tbody = document.getElementById('data-table-body');
            if(!tbody) return;
            tbody.innerHTML = '';
            
            // Geriye doğru döngü, en yeni projeksiyon en üstte
            for(let i = data.labels.length - 1; i >= 0; i--) {
                const tr = document.createElement('tr');
                
                const label = data.labels[i];
                const p = data.priceData[i];
                const a = data.agentsData[i];
                const liq = data.liquidationData[i];
                const isReal = !label.includes('Proje');
                
                let statusHtml = '<span style="color: #3dd56d;">Stabil</span>';
                if(data.lowLiquidityZone[i] === 1) {
                    statusHtml = '<span style="color: #ffb82e;">Düşük Likidite</span>';
                }
                if(liq > 0) {
                    statusHtml = '<span style="color: #ff4b4b; font-weight: bold;">Tasfiye (' + Math.round(liq) + ')</span>';
                }

                // Gerçek veriler için arka planı hafif farklı yap
                if(isReal) {
                    tr.style.backgroundColor = 'rgba(255,255,255,0.02)';
                }

                tr.innerHTML = `
                    <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${label} <span style="font-size: 0.8em; color: ${isReal ? '#3b82f6' : '#a3a8b8'};">${isReal ? '(Gerçek)' : '(Simülasyon)'}</span></td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">$${Math.round(p).toLocaleString('en-US')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${Math.round(a).toLocaleString('en-US')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${statusHtml}</td>
                `;
                tbody.appendChild(tr);
            }
        }

        // CSV Export Feature
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('btn-export-csv');
            if (btn) {
                btn.addEventListener('click', () => {
                    if (!lastSimData) {
                        alert("Veri yüklenmedi.");
                        return;
                    }
                    
                    let csvContent = "data:text/csv;charset=utf-8,";
                    csvContent += "Tick,Fiyat (USD),Aktif Ajanlar,Panik Endeksi,Tasfiye Siddeti\n";
                    
                    for(let i=0; i<100; i++) {
                        csvContent += `${i},${lastSimData.priceData[i]},${lastSimData.agentsData[i]},${lastSimData.panicData[i]},${lastSimData.liquidationData[i]}\n`;
                    }
                    
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "genesis_quantum_simulation_data.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            }
        });

       // --- Archive Logic ---
        const archiveData = [
    {"year": 2008, "title": "Bitcoin Whitepaper", "desc": "Satoshi Nakamoto makaleyi yayımladı.", "ana": "2008 Küresel Krizi sırasında güvene dayalı olmayan alternatif sistem tasarlandı.", "res": "Geleneksel bankacılığa karşı P2P transfer mimarisi atıldı.", "date": "2008-10-31"},
    {"year": 2009, "title": "Genesis Block Kazılması", "desc": "Satoshi ağın ilk bloğunu kazdı.", "ana": "Bloğa The Times gazetesinin banka kurtarma paketi manşeti eklendi.", "res": "Ağ resmen faaliyete geçti.", "date": "2009-01-03"},
    {"year": 2010, "title": "Bitcoin Pizza Günü", "desc": "10.000 BTC iki pizza için ödendi.", "ana": "Tarihteki ilk somut ticari işlem gerçekleşti.", "res": "Bitcoin ilk defa finansal bir değerleme kazandı.", "date": "2010-05-22"},
    {"year": 2011, "title": "Mt. Gox 1. Hack", "desc": "Borsa hacklendi, fiyat sentlere düştü.", "ana": "Güvenlik açığı yüzünden ilk büyük güven kaybı.", "res": "Kripto güvenliğinin önemi ilk kez anlaşıldı.", "date": "2011-06-19"},
    {"year": 2013, "title": "Kıbrıs Bankacılık Krizi", "desc": "Kıbrıs bankalarındaki mevduatlara el konulması dedikoduları.", "ana": "İnsanlar paralarını kurtarmak için merkeziyetsiz bir çıkış aradı.", "res": "Bitcoin ilk kez güvenli liman (safe haven) algısı oluşturmaya başladı.", "date": "2013-04-01"},
    {"year": 2013, "title": "Silk Road Kapatılması", "desc": "FBI kara borsa platformunu kapattı.", "ana": "Suç algısının kırılması için önemli bir dönüm noktası.", "res": "Kurumsal adaptasyona zemin hazırlayan regülatif temizlik.", "date": "2013-10-01"},
    {"year": 2014, "title": "Mt. Gox İflası", "desc": "850.000 BTC çalındı ve borsa çöktü.", "ana": "Merkezi borsaların yarattığı tekil hata noktası (SPOF) acı şekilde deneyimlendi.", "res": "Soğuk cüzdan (cold storage) kavramı standartlaştı.", "date": "2014-02-24"},
    {"year": 2015, "title": "Ethereum Ağı Başlatılması", "desc": "Akıllı sözleşme çağı başladı.", "ana": "Bitcoin'in sadece bir ödeme aracı olmaktan çıkıp, programlanabilir paraya evrilmesi fikri.", "res": "ICO çılgınlığının ve DeFi ekosisteminin temeli atıldı.", "date": "2015-07-30"},
    {"year": 2016, "title": "Bitfinex Hack", "desc": "120.000 BTC çalındı.", "ana": "Mt. Gox'tan sonraki en büyük borsa saldırısı.", "res": "Piyasa sarsılsa da kısa sürede toparlayarak olgunluk gösterdi.", "date": "2016-08-02"},
    {"year": 2017, "title": "Japonya Yasal Düzenlemesi", "desc": "Japonya Bitcoin'i yasal ödeme yöntemi tanıdı.", "ana": "Gelişmiş bir G7 ülkesinden gelen ilk tam regülatif kabul.", "res": "Kripto paraların uluslararası meşruiyeti büyük ivme kazandı.", "date": "2017-04-01"},
    {"year": 2017, "title": "SegWit ve Bitcoin Cash Fork", "desc": "Ölçeklenebilirlik savaşları sonuca ulaştı.", "ana": "Blok boyutunu artırmak isteyenler ağdan ayrılarak BCH'yi kurdu.", "res": "Bitcoin asli kodunu korudu ve değer deposu kimliğini perçinledi.", "date": "2017-08-01"},
    {"year": 2017, "title": "Cboe ve CME Futures İşlemleri", "desc": "İlk kurumsal vadeli işlemler başladı.", "ana": "Wall Street yatırımcıları fiziksel BTC tutmadan bahis yapabilme imkanı buldu.", "res": "2017 boğasının zirvesine giden kurumsal fomo tetiklendi.", "date": "2017-12-10"},
    {"year": 2017, "title": "ICO Çılgınlığı ve 20k Zirvesi", "desc": "Bitcoin 20.000 doları gördü.", "ana": "Düzenlemesiz binlerce ICO piyasaya para akıttı.", "res": "Sert bir balon patlaması ve 3 yıllık ayı piyasası başladı.", "date": "2017-12-17"},
    {"year": 2018, "title": "Hash Savaşları (BCH vs BSV)", "desc": "Madenci kampları arasında güç savaşı.", "ana": "Ağ güvenliğinin siyasi rant kavgalarına alet olması.", "res": "Kripto piyasasından 100 milyar doların üzerinde değer silindi.", "date": "2018-11-15"},
    {"year": 2019, "title": "Çin Başkanı Xi Jinping Açıklaması", "desc": "Çin'in blockchain'i temel teknoloji yapacağını duyurdu.", "ana": "Devlet destekli blok zinciri rüzgarı büyük bir ani alım dalgası yarattı.", "res": "Kripto para piyasası ayı trendinden kısa süreliğine şiddetle çıktı.", "date": "2019-10-25"},
    {"year": 2020, "title": "Covid-19 Kara Perşembe Çöküşü", "desc": "Bir günde %50'lik devasa çöküş.", "ana": "Küresel piyasalarla olan korelasyonun tavan yaptığı bir likidite krizi.", "res": "Sistemik tasfiyeler temizlendi ve devasa QE (parasal genişleme) ile boğa başladı.", "date": "2020-03-12"},
    {"year": 2020, "title": "MicroStrategy Alımı", "desc": "Michael Saylor şirket hazinesine BTC ekledi.", "ana": "Halka açık bir şirketin itibari para yerine BTC'yi rezerv yapması.", "res": "Kurumsal benimseme rüzgarı (Institutional FOMO) resmen başladı.", "date": "2020-08-11"},
    {"year": 2021, "title": "Tesla'nın 1.5 Milyar Dolarlık Alımı", "desc": "Elon Musk destekli dev kurumsal kabul.", "ana": "Dünyanın en yenilikçi şirketinin BTC'ye geçişi parakende çılgınlığı başlattı.", "res": "Fiyat parabolik bir yükselişle yeni zirvelere tırmandı.", "date": "2021-02-08"},
    {"year": 2021, "title": "Çin Madencilik Yasağı", "desc": "Ağ gücünün (hashrate) %50'si kapandı.", "ana": "Dünyanın en büyük madencilik operasyonları zorla göç ettirildi.", "res": "Ağ çökmeyerek olağanüstü bir dayanıklılık (resilience) testi geçti.", "date": "2021-05-19"},
    {"year": 2021, "title": "El Salvador Yasal İhale Yasası", "desc": "Bitcoin resmi para birimi oldu.", "ana": "İlk kez bir egemen ulus-devlet kripto parayı resmi rezervine aldı.", "res": "Jeopolitik oyun teorisi işlemeye başladı.", "date": "2021-06-09"},
    {"year": 2021, "title": "İlk ABD Futures ETF (BITO)", "desc": "Wall Street ETF'i işleme başladı.", "ana": "Spot olmasa da türev piyasası üzerinden gelen büyük regülatif zafer.", "res": "Kurumsal sermayenin giriş kapıları genişledi.", "date": "2021-10-19"},
    {"year": 2021, "title": "69.000 Dolar Zirvesi ve Taproot", "desc": "Bitcoin döngüsel tepe noktasını gördü.", "ana": "Düşük faizlerin yarattığı rüzgarın sonuna gelindiği nokta.", "res": "Makroekonomik sıkılaşma ve faiz artırımlarının başlamasıyla derin bir ayı piyasası tetiklendi.", "date": "2021-11-10"},
    {"year": 2022, "title": "Terra (LUNA) ve UST Çöküşü", "desc": "Algoritmik stablecoin imparatorluğu yıkıldı.", "ana": "Ölüm sarmalına (death spiral) giren UST, piyasadan 40 milyar dolar sildi.", "res": "Celsisus, 3AC gibi dev borç veren şirketlerin zincirleme iflası.", "date": "2022-05-09"},
    {"year": 2022, "title": "FTX Borsası İflası", "desc": "Dünyanın en büyük 2. borsası dolandırıcılıktan çöktü.", "ana": "Müşteri fonlarının yasa dışı kullanımıyla oluşan likidite krizi.", "res": "Regülasyon çağrıları arttı, güven dibe vurdu, fiyat 15k'ya geriledi.", "date": "2022-11-11"},
    {"year": 2023, "title": "SVB Krizi ve USDC De-peg", "desc": "Silikon Vadisi Bankası battı, USDC 1 dolar altına düştü.", "ana": "Geleneksel bankacılık krizi kriptoya sıçradı.", "res": "Kriz ortamında Bitcoin bankacılık riskine karşı sığınak olarak yeniden hatırlandı.", "date": "2023-03-11"},
    {"year": 2023, "title": "BlackRock Spot ETF Başvurusu", "desc": "Dünyanın en büyük varlık yöneticisi ETF istedi.", "ana": "9 Trilyon dolarlık devin pazara girmesi, SEC'in red geleneğini sarstı.", "res": "Piyasaya büyük bir meşruiyet ve güven dalgası geldi.", "date": "2023-06-15"},
    {"year": 2023, "title": "Grayscale SEC Davası Zaferi", "desc": "Mahkeme, SEC'in ETF reddini haksız buldu.", "ana": "Regülatörlerin keyfi kararlarına karşı alınan büyük yasal zafer.", "res": "Ocak ayındaki Spot ETF onaylarının yolu tamamen açılmış oldu.", "date": "2023-08-29"},
    {"year": 2024, "title": "ABD Spot ETF Onayları", "desc": "SEC 11 farklı spot Bitcoin ETF'ini onayladı.", "ana": "Tarihi kurumsal kabul. Milyarlarca dolarlık kalıcı pasif fon akışı garantilendi.", "res": "Bitcoin resmen Wall Street'in ana akım yatırım aracına dönüştü.", "date": "2024-01-10"},
    {"year": 2024, "title": "Bitcoin Yeni ATH (73.750 Dolar)", "desc": "Tarihte ilk kez halving öncesi rekor kırıldı.", "ana": "ETF'lerin yarattığı devasa talep arzı yuttu.", "res": "Dört yıllık piyasa döngüsü teorisi (Halving cycle) tamamen değişime uğradı.", "date": "2024-03-14"},
    {"year": 2024, "title": "Dördüncü Halving", "desc": "Blok ödülü 3.125 BTC'ye düştü.", "ana": "Bitcoin'in enflasyon oranı altının altına inerek en sert (hardest) varlık oldu.", "res": "Madencilik endüstrisinde büyük konsolidasyon dönemi başladı.", "date": "2024-04-19"}
];

        function renderArchive() {
            const container = document.getElementById('archive-container');
            container.innerHTML = '';
            
            archiveData.forEach((event, idx) => {
                const card = document.createElement('div');
                card.className = 'archive-card';
                card.innerHTML = `
                    <div class="archive-info">
                        <div class="archive-date">${event.date}</div>
                        <h3>${event.title}</h3>
                        <p><strong>Olay:</strong> ${event.desc}</p>
                        <p><strong>Analiz:</strong> ${event.ana}</p>
                        <p><strong>Sonuç:</strong> ${event.res}</p>
                    </div>
                    <div class="archive-chart-container">
                        <canvas id="archiveChart-${idx}"></canvas>
                    </div>
                `;
                container.appendChild(card);
                
                // Delay drawing to ensure canvas is in DOM
                setTimeout(() => drawEventChart(idx, event), 50);
            });
        }

        function drawEventChart(idx, event) {
            const ctx = document.getElementById(`archiveChart-${idx}`).getContext('2d');
            
            // Check keywords to simulate crash or pump
            const desc = (event.title + " " + event.desc + " " + event.ana).toLowerCase();
            const isCrash = desc.includes('çöküş') || desc.includes('hack') || desc.includes('krizi') || desc.includes('iflas') || desc.includes('yasak');
            const isBull = desc.includes('ath') || desc.includes('onay') || desc.includes('alım') || desc.includes('boğa') || desc.includes('zaferi');
            
            // Generate 30 data points representing a month
            const labels = Array.from({length: 30}, (_, i) => i);
            let price = 1000;
            const data = [];
            
            for(let i=0; i<30; i++) {
                if (i === 15) {
                    // The event happens!
                    if (isCrash) price = price * 0.7; // 30% drop
                    else if (isBull) price = price * 1.3; // 30% jump
                    else price = price * 1.05; 
                } else {
                    // Random wiggle
                    price = price * (1 + (Math.random() * 0.04 - 0.02));
                }
                data.push(price);
            }
            
            const color = isCrash ? '#ff4b4b' : (isBull ? '#3dd56d' : '#3b82f6');
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Fiyat İvmesi',
                        data: data,
                        borderColor: color,
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    }
                }
            });
        }

        renderArchive();

    
        const glossaryData = [
            { term: "Blockchain (Blok Zinciri)", def: "Verilerin kriptografik olarak birbirine bağlandığı, değiştirilemez ve merkeziyetsiz dijital kayıt defteri." },
            { term: "PoW (Proof of Work)", def: "Madencilerin matematiksel bulmacaları çözerek işlemleri doğruladığı konsensüs algoritması." },
            { term: "PoS (Proof of Stake)", def: "Doğrulayıcıların coinlerini kilitleyerek (stake) ağ güvenliğini sağladığı enerji verimli konsensüs modeli." },
            { term: "Node (Düğüm)", def: "Blok zinciri ağının kurallarını uygulayan ve kayıt defterinin bir kopyasını tutan bilgisayar." },
            { term: "Full Node", def: "Tüm işlem geçmişini barındıran ve ağdaki kuralları bağımsız bir şekilde tamamen doğrulayan düğüm." },
            { term: "Light Node", def: "Ağın tüm geçmişini indirmeden, sadece işlem onaylarını doğrulayan hafif düğüm." },
            { term: "Miner (Madenci)", def: "PoW ağlarında işlemleri bloğa eklemek için donanım gücü kullanan ve karşılığında ödül alan katılımcı." },
            { term: "Hashrate", def: "Ağdaki tüm madencilerin saniyede ürettiği kriptografik tahmin sayısı. Ağın güvenlik metriklerinden biri." },
            { term: "Halving (Yarılanma)", def: "Bitcoin ağında yaklaşık her dört yılda bir madenci blok ödülünün yarı yarıya azalması." },
            { term: "Mempool (Bellek Havuzu)", def: "Ağa gönderilmiş ancak henüz bir bloğa dahil edilmemiş onay bekleyen işlemlerin havuzu." },
            { term: "Block Reward (Blok Ödülü)", def: "Madencilere veya doğrulayıcılara yeni bir blok oluşturduklarında ağ tarafından verilen yeni coinler." },
            { term: "Transaction Fee (İşlem Ücreti)", def: "Bir işlemin ağda öncelikli onaylanması için kullanıcının madencilere ödediği komisyon." },
            { term: "UTXO (Unspent Transaction Output)", def: "Harcanmamış işlem çıktısı. Bitcoin'in, her bir coin'in kaynağını izlediği muhasebe modeli." },
            { term: "Genesis Block", def: "Satoshi Nakamoto tarafından kazılan, Bitcoin blok zincirinin başlangıç bloğu (Blok 0)." },
            { term: "Cryptography", def: "Verileri sadece hedeflenen alıcının okuyabileceği şekilde şifreleme ve deşifre etme bilimi." },
            { term: "Public Key (Açık Anahtar)", def: "Kripto para almak için başkalarıyla paylaşılan, banka IBAN numarasına benzeyen kriptografik adres." },
            { term: "Private Key (Özel Anahtar)", def: "Sadece sahibinin bilmesi gereken, cüzdandaki varlıkları harcama yetkisi veren gizli şifre." },
            { term: "Seed Phrase (Kurtarma İfadesi)", def: "Özel anahtarın türetildiği, cüzdanı geri yüklemek için kullanılan 12 veya 24 kelimelik anahtar sözcük dizisi." },
            { term: "Fork (Çatallanma)", def: "Blok zinciri protokolünde kuralların değişmesi sonucu ağın ve topluluğun iki farklı zincire ayrılması." },
            { term: "Hard Fork", def: "Eski kurallarla uyumlu olmayan, ağın tamamen yeni bir versiyona geçmesini zorunlu kılan kesin çatallanma." },
            { term: "Soft Fork", def: "Geriye dönük uyumluluk sağlayan, eski düğümlerin yeni işlemleri de geçerli sayabildiği hafif ağ güncellemesi." },
            { term: "Smart Contract (Akıllı Sözleşme)", def: "Kodlarına yazılan şartlar sağlandığında otomatik olarak çalışan ve aracıya ihtiyaç duymayan dijital sözleşmeler." },
            { term: "EVM (Ethereum Virtual Machine)", def: "Ethereum üzerindeki tüm akıllı sözleşmelerin çalıştırıldığı ve hesaplandığı çalışma ortamı." },
            { term: "Layer 1 (Katman 1)", def: "Kendi ağı, mutabakat mekanizması ve yerel kripto parası olan temel blok zincirleri (Örn: Bitcoin, Ethereum)." },
            { term: "Layer 2 (Katman 2)", def: "İşlem hızını ve ölçeklenebilirliği artırmak için Katman 1'in üzerine inşa edilen yan ağlar (Örn: Lightning Network, Arbitrum)." },
            { term: "Lightning Network", def: "Bitcoin ağında anında ve neredeyse ücretsiz mikro ödemelere olanak tanıyan Katman 2 çözümü." },
            { term: "SegWit (Segregated Witness)", def: "İşlem boyutunu küçültmek için imza verilerini ana veriden ayıran kritik bir Bitcoin güncellemesi." },
            { term: "Taproot", def: "Bitcoin'de gizliliği, ölçeklenebilirliği ve karmaşık çoklu imza senaryolarını geliştiren güncelleme." },
            { term: "Schnorr Signatures", def: "Birden fazla imzayı tek bir imza gibi göstererek gizliliği ve veri verimliliğini artıran kriptografik teknik." },
            { term: "SHA-256", def: "Bitcoin'in PoW madenciliğinde kullandığı, 256 bit uzunluğunda sabit bir çıktı üreten kriptografik özetleme fonksiyonu." },
            { term: "Difficulty Adjustment", def: "Bitcoin ağında ortalama blok üretim süresini 10 dakikada tutmak için her 2016 blokta bir zorluğun ayarlanması." },
            { term: "Consensus Mechanism", def: "Ağdaki tüm düğümlerin blok zincirinin geçerli durumu üzerinde anlaşmaya varmasını sağlayan kurallar bütünü." },
            { term: "51% Attack (%51 Saldırısı)", def: "Bir kişi veya grubun ağdaki madencilik gücünün %50'sinden fazlasını ele geçirerek işlemleri iptal etme veya çift harcama (double spend) yapma girişimi." },
            { term: "Double Spending (Çifte Harcama)", def: "Aynı dijital paranın kopyalanarak veya ağ manipüle edilerek aynı anda iki farklı kişiye harcanması sorunu." },
            { term: "Orphan Block (Yetim Blok)", def: "İki madencinin aynı anda geçerli bir blok bulması sonucu kısa zincirde kaldığı için ağ tarafından terk edilen blok." },
            { term: "Block Explorer", def: "Bir blok zincirindeki işlemleri, blokları ve adresleri sorgulamak ve izlemek için kullanılan arama motoru." },
            { term: "Mainnet (Ana Ağ)", def: "Bir kripto para projesinin gerçek değer taşıyan ve faaliyette olan nihai ağı." },
            { term: "Testnet (Test Ağı)", def: "Geliştiricilerin gerçek para riske atmadan yeni kodları veya uygulamaları test ettiği simülasyon ağı." },
            { term: "DApp (Decentralized Application)", def: "Arka ucu merkezi sunucular yerine akıllı sözleşmeler ve blok zinciri üzerinde çalışan uygulamalar." },
            { term: "Tokenomics", def: "Bir kripto paranın arzı, dağıtımı, enflasyon oranı ve kullanım senaryolarını inceleyen ekonomik modeli." },
            { term: "Inflationary Token", def: "Maksimum arzı olmayan ve sürekli olarak yeni token üretilen kripto varlıklar (Örn: Dogecoin)." },
            { term: "Deflationary Token", def: "Zamanla dolaşımdaki miktarının azaltıldığı (yakım vb.) ve arzının sınırlandırıldığı varlıklar." },
            { term: "Coin Burn (Coin Yakımı)", def: "Dolaşımdaki arzı azaltmak ve fiyat istikrarı sağlamak amacıyla belirli miktarda tokenın erişilemez ölü bir adrese gönderilmesi." },
            { term: "Max Supply (Maksimum Arz)", def: "Bir kripto paranın tarihinde üretilebilecek mutlak üst sınır miktarı (Örn: Bitcoin için 21 Milyon)." },
            { term: "Circulating Supply", def: "Şu anda piyasada halkın elinde bulunan ve ticarete konu olan mevcut token miktarı." },
            { term: "Interoperability", def: "Farklı blok zincirlerinin birbirleriyle veri ve değer transferi yaparak iletişim kurabilme yeteneği." },
            { term: "Oracle", def: "Blok zincirindeki akıllı sözleşmelere dış dünyadan (örneğin hava durumu, maç sonuçları, hisse fiyatları) gerçek zamanlı veri sağlayan hizmet." },
            { term: "Cold Wallet (Soğuk Cüzdan)", def: "İnternete bağlı olmayan, hacklenmeye karşı en yüksek güvenliği sağlayan donanım veya kağıt cüzdanlar." },
            { term: "Hot Wallet (Sıcak Cüzdan)", def: "İnternete sürekli bağlı olan, günlük işlemler için pratik ancak siber saldırılara daha açık yazılım cüzdanları." },
            { term: "Hardware Wallet", def: "Özel anahtarları çevrimdışı, şifreli bir çip içinde saklayan fiziksel USB benzeri cihaz (Örn: Ledger, Trezor)." },
            { term: "Paper Wallet", def: "Açık ve özel anahtarların QR kod formatında fiziksel bir kağıda basıldığı ultra-soğuk saklama yöntemi." },
            { term: "Multisig (Multi-Signature)", def: "Bir işlem veya fon transferi için tek bir kişi yerine birden fazla onay (anahtar) gerektiren cüzdan yapısı." },
            { term: "Self-Custody", def: "Varlıkların saklama yetkisinin bir borsa yerine tamamen kullanıcının kendi kontrolünde olması durumu." },
            { term: "Phishing (Oltalama)", def: "Kullanıcıların özel anahtarlarını veya şifrelerini çalmak için tasarlanmış sahte web siteleri ve e-postalar." },
            { term: "Dusting Attack", def: "Kullanıcıların adreslerine çok küçük miktarda coin (dust) göndererek, gizliliklerini deşifre edip kimliklerini bulmaya yönelik saldırı." },
            { term: "Rug Pull", def: "Geliştiricilerin sahte bir proje oluşturup yatırım topladıktan sonra likiditeyi çekerek kaçması şeklindeki dolandırıcılık." },
            { term: "Honeypot", def: "Yatırımcıların alım yapmasına izin veren ancak akıllı sözleşmedeki gizli bir kod yüzünden satış yapmalarını engelleyen tuzak projeler." },
            { term: "Sybil Attack", def: "Bir ağın kararlarını manipüle etmek için tek bir saldırganın çok sayıda sahte düğüm (node) oluşturması." },
            { term: "Replay Attack", def: "Bir hard fork sonrasında, bir zincirde yapılan geçerli işlemin diğer zincirde de aynen tekrarlanarak fonların çalınması riski." },
            { term: "MEV (Miner Extractable Value)", def: "Madencilerin işlemleri sıraya koyarken arbitraj ve front-running yaparak elde ettikleri ekstra gizli kâr." },
            { term: "Front-Running", def: "MEV botlarının bekleyen büyük bir alım işlemini görüp, ondan milisaniyeler önce kendi işlemini sıraya koyarak fiyat avantajı sağlaması." },
            { term: "Market Cap (Piyasa Değeri)", def: "Dolaşımdaki arz ile mevcut fiyatın çarpılması sonucu elde edilen toplam piyasa büyüklüğü." },
            { term: "Liquidity (Likidite)", def: "Bir varlığın piyasa fiyatını etkilemeden kolayca nakde veya başka bir varlığa çevrilebilme derecesi." },
            { term: "Volatility (Volatilite)", def: "Bir varlığın fiyatının belirli bir zaman dilimindeki dalgalanma hızı ve büyüklüğü." },
            { term: "Order Book (Emir Defteri)", def: "Bir borsadaki tüm alıcıların ve satıcıların verdikleri limit emirlerinin listelendiği tablo." },
            { term: "Bid-Ask Spread (Alış-Satış Farkı)", def: "Piyasadaki en yüksek alım emri (Bid) ile en düşük satım emri (Ask) arasındaki fiyat uçurumu." },
            { term: "Market Order (Piyasa Emri)", def: "Belirli bir fiyat hedefi gözetmeksizin, emrin o anki en iyi fiyattan derhal gerçekleşmesini sağlayan emir tipi." },
            { term: "Limit Order (Limit Emri)", def: "Sadece yatırımcının belirlediği spesifik bir fiyattan veya daha iyisinden gerçekleşmesi şartıyla sisteme girilen emir." },
            { term: "Stop-Loss", def: "Fiyatın yatırımcının belirlediği bir zararı kesme seviyesine düşmesi durumunda pozisyonun otomatik kapanmasını sağlayan emir." },
            { term: "Take-Profit", def: "Fiyat hedeflenen kâr seviyesine ulaştığında pozisyonu kapatarak kârı realize eden emir türü." },
            { term: "Slippage (Fiyat Kayması)", def: "Emrin sisteme girildiği andaki fiyat ile piyasa derinliğinin yetersizliği nedeniyle işlemin gerçekleştiği fiyat arasındaki olumsuz fark." },
            { term: "Leverage (Kaldıraç)", def: "Yatırımcıların borsadan borç alarak anaparalarından daha büyük pozisyonlar (10x, 50x) açmasını sağlayan marjin sistemi." },
            { term: "Margin (Teminat)", def: "Kaldıraçlı pozisyon açabilmek için borsaya rehin olarak bırakılması gereken minimum başlangıç sermayesi." },
            { term: "Liquidation (Tasfiye)", def: "Fiyatın terste kalması sonucu zararın marjin miktarını aşmasıyla borsanın pozisyonu zorla ve zararına kapatması." },
            { term: "Liquidation Cascade", def: "Büyük tasfiyelerin fiyatı daha da aşağı (veya yukarı) çekerek arka arkaya zincirleme tasfiyeleri tetiklemesi." },
            { term: "Long Position", def: "Varlığın değer kazanacağı beklentisiyle açılan alım pozisyonu." },
            { term: "Short Position", def: "Varlığın değer kaybedeceği beklentisiyle, borç alınarak yüksekten satılıp düşükten geri alınmasını hedefleyen pozisyon." },
            { term: "Funding Rate (Fonlama Oranı)", def: "Sürekli vadeli işlemlerde (Perpetual Futures) long ve short pozisyonlar arasında periyodik olarak ödenen dengeleme ücreti." },
            { term: "Arbitrage", def: "Aynı varlığın farklı borsalardaki fiyat farkından yararlanarak eşzamanlı risksiz kâr elde etme stratejisi." },
            { term: "DCA (Dollar Cost Averaging)", def: "Fiyat dalgalanmalarından bağımsız olarak, varlığı periyodik zamanlarda sabit miktarlarda kademeli olarak satın alma stratejisi." },
            { term: "Whale (Balina)", def: "Piyasayı sarsacak kadar çok elinde mal tutanlar." },
            { term: "Bear Market (Ayı Piyasası)", def: "Fiyatların sürekli düşüş trendinde olduğu, karamsarlığın hakim olduğu uzun süreli piyasa koşulu." },
            { term: "Bull Market (Boğa Piyasası)", def: "Fiyatların istikrarlı bir şekilde yükseldiği ve piyasaya coşku ve iyimserliğin hakim olduğu dönem." },
            { term: "Altcoin (Alternatif Coin)", def: "Bitcoin dışındaki Ethereum, Solana, Ripple gibi diğer tüm kripto para birimlerine verilen genel ad." },
            { term: "Stablecoin", def: "Değeri ABD Doları, altın veya başka bir itibari paraya sabitlenmiş fiyat istikrarı sağlayan kripto varlık." },
            { term: "Fiat (İtibari Para)", def: "Devletler tarafından basılan, arkasında altın karşılığı olmayan ancak devletin itibarına dayanan Dolar, Euro, TL gibi paralar." },
            { term: "OTC (Over the Counter)", def: "Piyasa fiyatını aniden düşürmemek için devasa balina işlemlerinin borsalar yerine doğrudan alıcı-satıcı arasında yapıldığı tezgah altı pazar." },
            { term: "CEX (Centralized Exchange)", def: "Binance, Coinbase gibi kullanıcı fonlarını kendi bünyesinde saklayan şirket yönetimindeki merkezi kripto para borsaları." },
            { term: "DEX (Decentralized Exchange)", def: "Uniswap, PancakeSwap gibi şirket veya sunucu olmadan, işlemlerin akıllı sözleşmeler aracılığıyla eşler arası yapıldığı merkeziyetsiz borsa." },
            { term: "AMM (Automated Market Maker)", def: "DEX'lerde geleneksel emir defteri yerine işlemlerin algoritmik bir likidite havuzu formülüyle fiyatlandığı sistem." },
            { term: "Liquidity Pool", def: "Kullanıcıların DEX'lerde ticaret yapılabilmesi için akıllı sözleşmelere kilitlediği token çiftlerinden oluşan fon havuzu." },
            { term: "Impermanent Loss", def: "Likidite havuzlarına fon sağlayanların, tokenların fiyatlarındaki değişimden dolayı sadece cüzdanda tutmaya kıyasla yaşadıkları geçici veya kalıcı fırsat maliyeti." },
            { term: "Yield Farming", def: "Yatırımcıların varlıklarını DeFi protokollerine kitleyerek yüksek faiz ve ek platform tokenları kazanması stratejisi." },
            { term: "Staking", def: "PoS ağlarında kullanıcıların ağ güvenliğini sağlamak için coinlerini kilitlemesi ve karşılığında pasif gelir elde etmesi." },
            { term: "TVL (Total Value Locked)", def: "Tüm kullanıcıların bir DeFi uygulamasının akıllı sözleşmelerine kilitlediği kripto paraların toplam dolar değeri." },
            { term: "ROI (Return on Investment)", def: "Yatırımın getirisini veya zararını anaparaya oranla ölçen finansal metrik." },
            { term: "ATH (All-Time High)", def: "Bir kripto paranın tarih boyunca ulaştığı en yüksek fiyat seviyesi." },
            { term: "ATL (All-Time Low)", def: "Bir kripto paranın tarih boyunca gördüğü en düşük fiyat seviyesi." },
            { term: "Support (Destek)", def: "Teknik analizde fiyat düşüşlerinin yavaşladığı ve alım tepkisinin geldiği tarihi taban fiyat seviyesi." },
            { term: "Resistance (Direnç)", def: "Fiyat yükselişlerinin zorlandığı ve satış baskısının yoğunlaştığı tarihi tavan fiyat seviyesi." },
            { term: "RSI (Relative Strength Index)", def: "Bir varlığın aşırı alım veya aşırı satım bölgesinde olup olmadığını gösteren teknik analiz momentum indikatörü." },
            { term: "Moving Average (Hareketli Ortalama)", def: "Geçmiş fiyat verilerinin ortalamasını alarak trend yönünü yumuşatan ve belirleyen grafik göstergesi." },
            { term: "Market Cycle", def: "Piyasaların genişleme, tepe noktası, daralma ve dip noktası aşamalarından oluşan tekrarlayan psikolojik döngüsü." },
            { term: "Pump and Dump", def: "Manipülatörlerin bir coin'i överek fiyatını yapay şekilde şişirmesi (pump) ve ardından zirveden satarak yatırımcıları mağdur etmesi (dump)." },
            { term: "HODL", def: "Piyasa ne kadar düşerse düşsün varlıkları satmama ve uzun vadeli tutma felsefesi. 'Hold On for Dear Life' olarak da anılır." },
            { term: "FOMO (Fear of Missing Out)", def: "Yükselen piyasayı veya fırsatı kaçırma korkusuyla plansızca yüksek fiyattan alım yapma dürtüsü." },
            { term: "FUD (Fear, Uncertainty, Doubt)", def: "Yatırımcıları paniğe sürükleyip satış yaptırmak için kasıtlı olarak yayılan korku, belirsizlik ve şüphe haberleri." },
            { term: "Rekt", def: "'Wrecked' kelimesinin bozulmuş hali. Bir yatırımcının yanlış hamleyle veya tasfiye olarak tüm parasını kaybetmesi durumu." },
            { term: "To the Moon (Aya Çıkış)", def: "Bir varlığın fiyatının durdurulamaz bir şekilde inanılmaz seviyelere yükseleceğine dair aşırı iyimser ifade." },
            { term: "Bagholder", def: "Fiyatı çökmüş ve eski seviyesine dönme umudu kalmamış değersiz coinleri elinde tutmak zorunda kalan yatırımcı." },
            { term: "Diamond Hands (Elmas Eller)", def: "Piyasa ne kadar sarsılırsa sarsılsın panik satışı yapmayan iradeli yatırımcı." },
            { term: "Paper Hands (Kağıt Eller)", def: "En ufak bir düşüşte panikleyerek zararına satış yapan iradesiz yatırımcı." },
            { term: "Shill", def: "Bir kişinin finansal çıkar uğruna bir projeyi sosyal medyada abartılı ve aldatıcı bir şekilde pazarlaması." },
            { term: "Ape In", def: "Herhangi bir araştırma yapmadan, sırf yükseliyor diye gözü kapalı bir şekilde projeye veya coin'e girmek." },
            { term: "BTFD (Buy The F***ing Dip)", def: "Fiyatlarda yaşanan sert düzeltmelerin ve düşüşlerin aslında harika bir alım fırsatı olduğunu savunan strateji." },
            { term: "WAGMI (We're All Gonna Make It)", def: "Kripto topluluğunda uzun vadede herkesin çok zengin ve başarılı olacağına dair umut aşılayan slogan." },
            { term: "NGMI (Not Gonna Make It)", def: "Kötü yatırım kararları alanların asla başarılı olamayacağını ifade eden alaycı kısaltma." },
            { term: "Degen (Degenerate)", def: "Yüksek riskli, arkası boş DeFi projelerine kumar bağımlısı gibi pervasızca yatırım yapan alt-kültür yatırımcısı." },
            { term: "Flippening", def: "Ethereum'un piyasa değerinin bir gün Bitcoin'i geçerek birinci sıraya oturacağı beklentisine verilen isim." },
            { term: "Maxi (Maximalist)", def: "Yalnızca Bitcoin'in gerçek ve değerli olduğuna, diğer tüm altcoinlerin çöp (shitcoin) olduğuna inanan fanatik." },
            { term: "Shitcoin", def: "Hiçbir kullanım alanı, temel amacı veya teknolojisi olmayan değersiz kripto paralar." },
            { term: "On-Chain Analytics", def: "Blok zincirinin halka açık verilerini analiz ederek balina hareketleri, borsa çıkışları gibi makro trendleri öngörme bilimi." },
            { term: "Hash Ribbons", def: "Madenci kapitülasyonlarını tespit ederek tarihsel olarak en güçlü Bitcoin alım sinyallerinden birini veren gösterge." },
            { term: "SOPR (Spent Output Profit Ratio)", def: "On-chain verilerde yatırımcıların genel olarak zararına mı yoksa kârına mı satış yaptığını gösteren duyarlılık oranı." },
            { term: "MVRV Ratio", def: "Bitcoin'in mevcut piyasa değerinin (Market Cap), gerçekleşmiş değerine (Realized Cap) bölünmesiyle hesaplanan aşırı değerleme indeksi." },
            { term: "Realized Cap", def: "Mevcut fiyattan değil, her bir Bitcoin'in en son hareket ettiği fiyattan değerlenmesiyle oluşturulan gerçeklik metriği." },
            { term: "Quantitative Easing (QE)", def: "Merkez bankalarının ekonomiyi canlandırmak için para basarak tahvil satın aldığı genişlemeci makroekonomik politika. Kripto için yakıttır." },
            { term: "Quantitative Tightening (QT)", def: "Merkez bankalarının bilançolarını daraltarak piyasadaki nakdi geri çektiği ve kripto gibi risk varlıklarını baskılayan sıkılaşma politikası." },
            { term: "Inflation (Enflasyon)", def: "Paranın satın alma gücünün sürekli olarak düşmesi durumu. Bitcoin enflasyona karşı korunma (hedge) aracı olarak görülür." },
            { term: "Deflation (Deflasyon)", def: "Fiyatların genel seviyesinin düşmesi ve paranın değerinin artması." },
            { term: "CPI (Tüketici Fiyat Endeksi)", def: "ABD enflasyonunu ölçen ve açıklandığı gün kripto piyasalarında büyük volatilitelere yol açan makro veri." },
            { term: "Fed (Federal Reserve)", def: "Para politikası kararlarıyla (faiz artırımı/indirimi) tüm küresel risk varlıklarını ve kripto piyasasını yönlendiren ABD Merkez Bankası." },
            { term: "Interest Rate (Faiz Oranı)", def: "Merkez bankalarının borçlanma maliyetini belirlediği oran. Faiz düştüğünde Bitcoin gibi varlıklara sermaye akışı hızlanır." },
            { term: "Dominance (Hakimiyet)", def: "Bitcoin'in toplam piyasa değerinin, tüm kripto para piyasasının değerine oranı. Altcoin sezonlarının habercisidir." },
            { term: "Altseason (Altcoin Sezonu)", def: "Bitcoin hakimiyetinin düştüğü ve altcoinlerin Bitcoin'e kıyasla çok daha yüksek getiriler sağladığı coşkulu dönem." },
            { term: "Web3", def: "Kullanıcıların kendi verilerine sahip olduğu ve aracıların ortadan kalktığı blok zinciri tabanlı merkeziyetsiz internet vizyonu." },
            { term: "NFT (Non-Fungible Token)", def: "Blok zinciri üzerinde sahipliği kanıtlanan, birbirinin yerine geçemeyen ve eşsiz dijital sanat eserleri, oyun içi eşyalar veya tapular." },
            { term: "Metaverse", def: "İnsanların sanal gerçeklikte etkileşime girdiği, ekonomisinin kripto paralar ve NFT'ler üzerinden döndüğü dijital evren." },
            { term: "DAO (Decentralized Autonomous Organization)", def: "Merkezi bir CEO yerine, token sahiplerinin oylamalarıyla yönetilen ve kuralları akıllı sözleşmelere yazılı organizasyonlar." },
            { term: "Airdrop", def: "Projelerin kendi ağlarını kullanan erken dönem test kullanıcılarına veya topluluğa ücretsiz token dağıtarak pazarlama yapması." },
            { term: "Minting", def: "Bir blok zincirinde ilk kez bir tokenın veya NFT'nin yaratılarak dolaşıma sokulması süreci." },
            { term: "Floor Price (Taban Fiyat)", def: "Bir NFT koleksiyonunda satışa sunulan en ucuz parçanın o anki piyasa fiyatı." },
            { term: "Gas Fee", def: "Ethereum ağında bir işlemi veya akıllı sözleşmeyi gerçekleştirmek için ödenen, ağ yoğunluğuna göre değişen işlem ücreti." },
            { term: "Gwei", def: "Ethereum işlem ücretlerini (Gas) hesaplarken kullanılan Ether'in milyarda birlik alt birimi." },
            { term: "ERC-20", def: "Ethereum ağında birbirinin yerine geçebilen (fungible) standart tokenların oluşturulmasını sağlayan teknik protokol." },
            { term: "ERC-721", def: "Ethereum ağında benzersiz ve bölünemez (non-fungible) NFT'lerin oluşturulmasını sağlayan teknik standart." },
            { term: "InterPlanetary File System (IPFS)", def: "Dosyaları ve verileri merkezi sunucular yerine eşler arası dağıtık bir ağda barındıran protokol." },
            { term: "Zero-Knowledge Proofs (ZK)", def: "Bir tarafın, diğer tarafa bir bilginin doğruluğunu, bilginin kendisini açığa çıkarmadan matematiksel olarak ispatlamasını sağlayan kriptografi teknolojisi." },
            { term: "Rollups", def: "Katman 2 ağlarının, yüzlerce işlemi kendi içinde sıkıştırarak (roll-up) Katman 1 ağına tek bir işlem olarak gönderdiği ölçeklendirme çözümü." },
            { term: "ASIC (Application-Specific Integrated Circuit)", def: "Madencilik için özel üretilmiş, sadece SHA-256 gibi spesifik algoritmaları çözmeye odaklı yüksek performanslı donanım." },
            { term: "ASIC Resistance", def: "Bir blok zincirinin ASIC donanımlarının değil, sadece standart ekran kartları (GPU) ile kazılabilmesini sağlamaya yönelik algoritma tasarımı." },
            { term: "BIP (Bitcoin Improvement Proposal)", def: "Geliştiricilerin Bitcoin protokolüne yeni özellikler veya standartlar önermek için hazırladıkları resmi teknik taslaklar." },
            { term: "EIP (Ethereum Improvement Proposal)", def: "Ethereum ağı için önerilen ve topluluk tarafından tartışılan teknik güncellemeler ve standart teklifleri." },
            { term: "Block Height (Blok Yüksekliği)", def: "Genesis bloğundan itibaren ağda kazılmış ve zincire eklenmiş toplam blok sayısı." },
            { term: "Block Time", def: "Ağın algoritmasına göre iki geçerli bloğun bulunması arasında geçen hedeflenen süre (Örn: BTC 10 dk, ETH 12 sn)." },
            { term: "Confirmation (Onay)", def: "Bir işlemin yeni bir bloğa dahil edilip ağ tarafından kabul görmesi. Genelde borsalar için 6 onay güvenli kabul edilir." },
            { term: "Decentralization (Merkeziyetsizlik)", def: "Ağın tek bir sunucuya, kuruma veya yöneticiye bağlı kalmadan binlerce bağımsız düğüm tarafından yönetilmesi." },
            { term: "Emission Rate (Emisyon Oranı)", def: "Bir kripto para biriminin ne kadar hızla üretildiğini ve dolaşıma sokulduğunu gösteren metrik." },
            { term: "Hash (Özet)", def: "Değişken uzunluktaki verinin matematiksel bir fonksiyondan geçirilerek sabit uzunlukta benzersiz bir şifreli metne dönüştürülmesi." },
            { term: "Mainnet Swap", def: "Bir projenin geçici olarak başka bir ağda (örn. Ethereum) çıkardığı tokenlarını, kendi orijinal ağına (Mainnet) taşıması." },
            { term: "Merkle Tree", def: "Blok içerisindeki binlerce işlemi hiyerarşik bir ağaç yapısında özetleyerek doğrulama hızını artıran veri yapısı." },
            { term: "Nonce", def: "Madencilerin doğru blok özetini (hash) bulmak için saniyede milyarlarca kez değiştirdiği rastgele sayı." },
            { term: "P2P (Peer-to-Peer)", def: "Bir merkezi sunucuya bağlanmak yerine kullanıcıların bilgisayarlarının doğrudan birbiriyle veri alışverişi yaptığı iletişim modeli." },
            { term: "Protocol", def: "Ağdaki bilgisayarların birbiriyle nasıl konuşacağını ve işlemlerin nasıl doğrulanacağını belirleyen kesin kurallar dizisi." },
            { term: "Timestamp (Zaman Damgası)", def: "Bir bloğun ve içerdiği işlemlerin tam olarak hangi saniyede ağa kaydedildiğini kanıtlayan değiştirilemez veri." },
            { term: "Turing Complete", def: "Ethereum gibi ağların, teorik olarak bir bilgisayarın çözebileceği her türlü hesaplama ve kodu çalıştırabilme kapasitesi." },
            { term: "Validator (Doğrulayıcı)", def: "PoS ağlarında varlıklarını kilitleyerek (stake) işlemleri onaylayan ve yeni blokları zincire ekleyen katılımcı." },
            { term: "Wallet Address (Cüzdan Adresi)", def: "Açık anahtardan türetilen, başkalarının size kripto para göndermesi için kullandığı genellikle 26-35 karakterlik dizi." },
            { term: "Whitepaper", def: "Satoshi Nakamoto'nun 2008'de yaptığı gibi, projenin teknolojisini, amacını ve çözüm önerilerini detaylandıran teknik doküman." },
            { term: "Account Abstraction", def: "Ethereum'da kullanıcı cüzdanlarını akıllı sözleşmelere dönüştürerek sosyal kurtarma, otomatik ödeme gibi gelişmiş özellikler sağlayan teknoloji (ERC-4337)." },
            { term: "AMM (Otomatik Piyasa Yapıcı)", def: "Geleneksel emir defteri olmadan işlemlerin havuzdaki tokenların oranına göre algoritmik olarak gerçekleştiği DEX sistemi." },
            { term: "API Key", def: "Yatırımcıların borsa hesaplarını portföy yönetim uygulamalarına veya işlem botlarına bağlamak için kullandığı dijital anahtar." },
            { term: "BFT (Byzantine Fault Tolerance)", def: "Ağdaki bazı bilgisayarların arızalanmasına veya kötü niyetli davranmasına rağmen tüm sistemin çökmeksizin doğru karara varabilme yeteneği." },
            { term: "Bridge (Köprü)", def: "Farklı blok zinciri ağları arasında (örn. Ethereum'dan Polygon'a) kripto para ve veri transferini sağlayan protokol." },
            { term: "Censorship Resistance", def: "Hiçbir hükümetin, bankanın veya kurumun blok zincirindeki işlemleri engelleyememesi veya geri alamaması özelliği." },
            { term: "CLI (Command Line Interface)", def: "Geliştiricilerin arayüz kullanmadan doğrudan terminal komutlarıyla cüzdan ve ağ operasyonlarını yürüttüğü arabirim." },
            { term: "Collateral (Teminat)", def: "DeFi kredilerinde veya kaldıraçlı işlemlerde borç alabilmek için kilitlenen ve borç ödenmezse likide edilen varlık." },
            { term: "Consortium Blockchain", def: "Tamamen halka açık (public) veya tamamen kapalı (private) olmak yerine bir grup şirketin ortak yönettiği blok zinciri modeli." },
            { term: "Crowdloan", def: "Polkadot ekosisteminde projelerin parachain slotu kazanmak için topluluktan kilitli DOT tokenı destek olarak toplama süreci." },
            { term: "Cryptography", def: "Açık ağlar üzerinde güvenli iletişim kurmak ve verileri şifrelemek için kullanılan matematiğin alt dalı." },
            { term: "Cryptoeconomics", def: "Kriptografi ve oyun teorisi ilkelerini kullanarak ağdaki katılımcıların iyi niyetli davranmasını teşvik eden disiplin." },
            { term: "Custodial", def: "Özel anahtarların sizin yerinize Binance, Coinbase gibi merkezi bir platform tarafından yönetildiği ve saklandığı hizmet." },
            { term: "Cyberpunk", def: "1990'larda internetin gözetim ve otoriteden kurtulması için kriptografiyi savunan aktivist hareket (Cypherpunk)." },
            { term: "DAG (Directed Acyclic Graph)", def: "Geleneksel blok zinciri yerine işlemlerin bir ağ şeklinde birbirini onayladığı daha hızlı ve ücretsiz veri yapısı (Örn: IOTA, Nano)." },
            { term: "Dark Web", def: "Sadece Tor gibi özel tarayıcılarla girilebilen, ilk Bitcoin adaptasyonunun yoğun olarak gerçekleştiği denetimsiz internet katmanı." },
            { term: "Dead Cat Bounce (Ölü Kedi Sıçraması)", def: "Sert bir düşüş trendinde yaşanan ve yükseliş başlıyor yanılgısı yaratan kısa süreli ve zayıf fiyat tepkisi." },
            { term: "Death Cross (Ölüm Kesişimi)", def: "Kısa vadeli hareketli ortalamanın (örn. 50 günlük), uzun vadeli hareketli ortalamayı (örn. 200 günlük) aşağı yönlü kesmesiyle oluşan güçlü ayı piyasası sinyali." },
            { term: "Golden Cross (Altın Kesişim)", def: "50 günlük hareketli ortalamanın, 200 günlük hareketli ortalamayı yukarı yönlü keserek oluşturduğu güçlü boğa piyasası sinyali." },
            { term: "Decentralized Identity (DID)", def: "Kullanıcıların dijital kimliklerini dev teknoloji şirketlerinin tekelinden çıkarıp blok zincirinde şifreli olarak barındırması." },
            { term: "Devnet (Geliştirici Ağı)", def: "Testnet'ten de önceki aşamada, sadece çekirdek geliştiricilerin yeni özellikleri denediği oldukça deneysel ağ sürümü." },
            { term: "Dex Aggregator", def: "Kullanıcıya en iyi fiyatı sunmak için 1inch gibi farklı merkeziyetsiz borsalardaki likidite havuzlarını tarayan ve emri bölen protokol." },
            { term: "Diluted Market Cap", def: "Bir kripto paranın şu anki arzı değil, maksimum arzının tamamı piyasada olsaydı oluşacak olan teorik toplam piyasa değeri." },
            { term: "Distributed Ledger Technology (DLT)", def: "Blok zincirini de kapsayan, verilerin merkezi bir sunucu yerine binlerce bilgisayara dağıtıldığı teknolojilerin üst şemsiye terimi." },
            { term: "Dust", def: "İşlem ücretini (Gas) bile karşılamayacak kadar küçük, cüzdanda kalan ve transfer edilemeyen artık coin kırıntıları." },
            { term: "Eclipse Attack", def: "Kötü niyetli kişilerin bir düğümü (node) izole edip ona sadece kendi sahte işlem verilerini göndererek onu ağdan koparması." },
            { term: "Entry Point (Giriş Noktası)", def: "Yatırımcının teknik analiz veya stratejisine dayanarak bir varlığı satın almayı uygun gördüğü spesifik fiyat seviyesi." },
            { term: "EVM-Compatible", def: "Binance Smart Chain, Avalanche C-Chain gibi kendi ağı olmasına rağmen Ethereum akıllı sözleşmelerini çalıştırabilen ağlar." },
            { term: "Exit Scam", def: "Proje kurucularının topluluktan para topladıktan veya yatırım aldıktan sonra sosyal medyalarını kapatıp fonlarla birlikte ortadan kaybolması." },
            { term: "Fair Launch (Adil Başlangıç)", def: "Ön satış veya özel yatırımcılara ayrılan bir pay olmadan, herkesin eşit şartlarda kazarak veya alarak başladığı token lansmanı." },
            { term: "Faucet", def: "Kullanıcıların testnet ağlarında işlem ücretlerini ödeyebilmeleri için ücretsiz ve değersiz test coinleri dağıtan platformlar." },
            { term: "Fiat Gateway", def: "Kullanıcıların kredi kartı veya banka havalesi ile kripto ekosistemine itibari para (Dolar, TL vb.) sokmasını sağlayan servis." },
            { term: "Flash Crash", def: "Aşırı satış baskısı veya algoritmik bir hata sonucu saniyeler içinde fiyatın çöktüğü ve hemen geri toplandığı olay." },
            { term: "Flash Loan (Flaş Kredi)", def: "DeFi ekosisteminde, teminat gösterilmeksizin alınan ancak aynı işlem bloğu içerisinde geri ödenmesi zorunlu olan anlık devasa krediler." },
            { term: "Flipping", def: "Özellikle NFT piyasasında veya ICO dönemlerinde, bir varlığı ucuzdan alıp (mint edip) saatler içinde yüksek fiyattan başkasına satma stratejisi." },
            { term: "Fractional Reserve", def: "Borsaların veya bankaların müşteri fonlarının %100'ünü karşılık olarak tutmayıp bir kısmını yatırıma yönlendirdiği sistem." },
            { term: "Front-End", def: "Bir uygulamanın kullanıcıların gördüğü, cüzdan bağladığı ve işlem yaptığı web arayüzü kısmı." },
            { term: "Full-Time Trader", def: "Başka hiçbir geliri olmadan hayatını tamamen kripto veya hisse piyasalarında aktif al-sat yaparak kazanan kişi." },
            { term: "Fungible", def: "Birbirinin yerine geçebilen, özellikleri tamamen aynı olan varlıklar. Örn: Senin elindeki 1 BTC ile benim elimdeki 1 BTC'nin farkı yoktur." },
            { term: "Non-Fungible", def: "Eşsiz olan ve diğerleriyle aynı değeri taşımayan varlıklar. Örn: Bir sanat eseri veya bir gayrimenkul tapusu (NFT'lerin temel mantığı)." },
            { term: "GameFi", def: "Kullanıcıların oyun oynayarak (Play-to-Earn) kripto para veya NFT kazandığı ve oyun içi ekonomilerin blok zincirine entegre olduğu konsept." },
            { term: "Gas Limit", def: "Ethereum ağında bir kullanıcının belirli bir işlemi gerçekleştirmek için harcamayı göze aldığı maksimum gas miktarı." },
            { term: "Geth", def: "Ethereum ağında çalışmak üzere Go diliyle yazılmış, dünyadaki en yaygın Ethereum düğüm (node) istemci yazılımı." },
            { term: "Gossip Protocol", def: "Düğümlerin ağda yeni çıkan blokları ve işlemleri tıpkı bir 'dedikodu' gibi birbirlerine anında ve dağıtık bir şekilde yayma algoritması." },
            { term: "Governance Token", def: "Sahiplerine projenin gelecekteki güncellemeleri, hazine fonlarının kullanımı gibi konularda oy hakkı veren kripto paralar (Örn: UNI, MKR)." },
            { term: "Gwei", def: "Ethereum işlem ücretlerini hesaplamakta kullanılan birim (1 Ether = 1 Milyar Gwei)." },
            { term: "Hal Finney", def: "Satoshi Nakamoto'dan ilk Bitcoin transferini alan, e-posta listelerinde Bitcoin'e inanan ve kodlara katkı sağlayan efsanevi kriptograf." },
            { term: "Hard Cap", def: "Bir ICO (İlk Coin Arzı) veya fon toplama sürecinde projenin almayı kabul ettiği en yüksek toplam yatırım miktarı." },
            { term: "Soft Cap", def: "Projenin iptal edilmeden geliştirilmeye başlanması için ICO sırasında toplanması gereken minimum yatırım tutarı." },
            { term: "Hash Rate", def: "Bitcoin madencilik ağının saniyede denediği milyarlarca şifreleme tahmini gücü. Ağ ne kadar güçlü olursa hacklenmesi o kadar zorlaşır." },
            { term: "HD Wallet (Hierarchical Deterministic)", def: "Tek bir ana kurtarma kelimesinden (Seed phrase) sınırsız sayıda yeni ve benzersiz alt cüzdan adresleri üretebilen cüzdan standartı." },
            { term: "Honeyminer", def: "Bilgisayarın arka planında çalışarak kullanıcıların cihazlarını bir havuza dahil edip Bitcoin madenciliği yapmasını sağlayan uygulamalara verilen genel ad." },
            { term: "Iceberg Order (Buzdağı Emri)", def: "Balinaların piyasayı korkutmamak için devasa büyüklükteki bir satım emrini küçük parçalara bölerek sırayla tahtaya koyması stratejisi." },
            { term: "IDO (Initial DEX Offering)", def: "Projenin ön satışını doğrudan merkeziyetsiz bir borsada (PancakeSwap, Uniswap) gerçekleştirmesi." },
            { term: "IEO (Initial Exchange Offering)", def: "Proje ön satışının doğrudan Binance Launchpad gibi merkezi borsalar üzerinden denetimli bir şekilde yapılması." },
            { term: "Immutable (Değiştirilemezlik)", def: "Blok zincirine kaydedilen bir işlemin geriye dönük olarak hacklenememesi, silinememesi ve manipüle edilememesi durumu." },
            { term: "Impermanent Loss (Kalıcı Olmayan Kayıp)", def: "Likidite sağlayan kullanıcıların, havuza koydukları tokenların dış piyasada fiyat değiştirmesi nedeniyle oluşan fırsat zararı." },
            { term: "Index Fund (Endeks Fonu)", def: "Tek bir coin seçmek yerine kripto pazarının ilk 10 coinini sepete ekleyerek genel piyasa performansını takip eden fon yapısı." },
            { term: "Initial Coin Offering (ICO)", def: "Projelerin geliştirme aşamasındayken yatırımcılara kendi çıkardıkları tokenları satarak sermaye topladığı finansman yöntemi." },
            { term: "Interoperability", def: "Polkadot veya Cosmos gibi projelerin, birbirinden tamamen farklı ağların birbirleriyle iletişim kurmasını sağlaması." },
            { term: "IPFS (InterPlanetary File System)", def: "Web sitelerini ve NFT medya dosyalarını merkezi sunucularda değil, eşler arası dağıtık ağlarda barındıran teknoloji." },
            { term: "KYC (Know Your Customer)", def: "Borsaların regülasyonlar gereği kullanıcılarından kimlik, pasaport ve adres doğrulaması talep etmesi süreci." },
            { term: "AML (Anti-Money Laundering)", def: "Kara para aklamayı önlemek için devletlerin koyduğu ve borsaların uymak zorunda olduğu yasalar bütünü." },
            { term: "Layer 0 (Katman 0)", def: "Polkadot gibi diğer bağımsız blok zincirlerinin (Layer 1) kendi üzerlerinde çalışmasına olanak tanıyan temel iletişim katmanı." },
            { term: "Ledger", def: "İşlemlerin tutulduğu ana defter." },
            { term: "Hardware Ledger", def: "Özel anahtarları koruyan soğuk donanım cüzdan markası." },
            { term: "Limit Order", def: "Fiyatın tam olarak sizin belirlediğiniz bir seviyeye gelmesi şartıyla alış veya satış yapılmasını emreden mekanizma." },
            { term: "Liquidation Price", def: "Kaldıraçlı işlemlerde yatırılan teminatın sıfırlandığı ve pozisyonun borsa tarafından otomatik olarak yok edildiği fiyat noktası." },
            { term: "Liquidity Mining", def: "Protokollerin, kendi platformlarına fon (likidite) sağlayan kullanıcılara platform tokenı ile faiz ödemesi." },
            { term: "Long Squeeze", def: "Fiyatın aniden düşmesiyle 'Long' (yükseliş) bekleyen çok sayıda kişinin tasfiye edilmesi ve zincirleme satış baskısı yaratması durumu." },
            { term: "Short Squeeze", def: "Fiyatın aniden yükselmesiyle 'Short' açanların tasfiye olup zorla alım yapmak zorunda kalması ve fiyatı daha da yukarı fırlatması." },
            { term: "Mainnet", def: "Test aşaması bitmiş ve gerçek paraların döndüğü orijinal ve bağımsız blok zinciri ağı." },
            { term: "Testnet", def: "Geliştiricilerin sadece deneme amacıyla kullandığı değeri olmayan ağ." },
            { term: "Margin Call (Marjin Çağrısı)", def: "Kaldıraçlı pozisyonlarda tasfiye yaklaşırken borsanın yatırımcıdan teminat eklemesini istediği uyarı." },
            { term: "Market Order", def: "Fiyata bakılmaksızın tahtadaki o anki en iyi fiyattan derhal gerçekleşmesi istenen piyasa emri." },
            { term: "Masternode", def: "Ağdaki işlemlerin anonimleştirilmesi veya oylamaların yapılması gibi özel görevleri üstlenen ve yüklü miktarda coin stake eden gelişmiş düğüm (Örn: DASH)." },
            { term: "Maximum Extractable Value (MEV)", def: "Madencilerin yeni bloğu oluştururken yüksek komisyon ödeyen işlemleri öne çekip ekstra kâr elde ettiği arka kapı stratejisi." },
            { term: "Mempool", def: "Ağa iletilen fakat henüz madenciler tarafından onaylanmamış işlemlerin geçici olarak tutulduğu havuz." },
            { term: "MetaMask", def: "Ethereum ve EVM uyumlu ağlara erişim sağlayan, tarayıcı eklentisi ve mobil uygulama formundaki en yaygın Web3 sıcak cüzdanı." },
            { term: "Microtransaction", def: "Kredi kartlarıyla yüksek komisyonlardan dolayı yapılamayan ancak Lightning Network ile mümkün olan birkaç kuruşluk anlık ödemeler." },
            { term: "Miner Extractable Value (MEV)", def: "Ethereum ve diğer akıllı kontrat platformlarında madencilerin front-running yaparak işlem sırasını değiştirmesi." },
            { term: "Mint", def: "Yepyeni bir NFT'yi veya tokenı blok zinciri ağına basarak ilk defa dolaşıma sokma eylemi." },
            { term: "Moon", def: "Fiyatın roket gibi fırlayarak aya çıkacağını iddia eden umutlu ifade." },
            { term: "Moving Average Convergence Divergence (MACD)", def: "Trendin yönünü ve gücünü ölçmek için kullanılan gelişmiş bir momentum indikatörü." },
            { term: "Multisig", def: "Paranın cüzdandan çıkabilmesi için 3 ortaktan 2'sinin onaylaması gerektiği gibi kurallar tanımlanabilen çoklu imza cüzdanı." },
            { term: "Node", def: "Bitcoin yazılımını bilgisayarına kurup ağı senkronize eden, işlemleri onaylayan ve yayınlayan her bir bilgisayar." },
            { term: "Non-Custodial", def: "Kullanıcının anahtarlarına %100 sahip olduğu cüzdan türü (Trust Wallet, Metamask)." },
            { term: "Custodial", def: "Kullanıcının anahtarlarını platformun tuttuğu cüzdan türü (Binance)." },
            { term: "Nonce (Number Only Used Once)", def: "PoW madenciliğinde doğru hash değerini bulmak için saniyede trilyonlarca kez değiştirilerek denenen rastgele tekil sayı." },
            { term: "Off-Chain", def: "Doğrudan blok zincirine kaydedilmeyip daha hızlı ve ucuz olduğu için ağın dışında yürütülen işlemler (Lightning Network)." },
            { term: "On-Chain", def: "Tüm dünyanın görebileceği şekilde doğrudan blok zincirinin ana defterine kaydedilen silinemez işlemler." },
            { term: "Oracle", def: "Chainlink gibi akıllı sözleşmelere dış dünyadan dolar fiyatı veya hava durumu gibi gerçek zamanlı veri akışı sağlayan sistemler." },
            { term: "Order Book", def: "Alıcıların ve satıcıların tekliflerini içeren borsa tahtası." },
            { term: "Orphan Block", def: "Aynı anda kazılan iki bloktan, ağın daha uzun zinciri tercih etmesi nedeniyle dışarıda kalarak geçersiz sayılan geçerli blok." },
            { term: "OTC (Tezgah Altı Piyasa)", def: "Balinaların işlem yaparken borsada devasa dalgalanma yaratmamak için aracı kurumlarla özel fiyat üzerinden yaptığı ticaret." },
            { term: "Paper Wallet", def: "Özel anahtarın QR kod olarak kağıda basılıp bir kasada saklandığı tamamen offline cüzdan türü." },
            { term: "Parachain", def: "Polkadot ağına paralel olarak çalışan ve güvenliği Polkadot tarafından sağlanan özel blok zincirleri." },
            { term: "Peer-to-Peer (P2P)", def: "Arada banka olmadan doğrudan iki kişinin cüzdanı arasındaki iletişim." },
            { term: "Phishing", def: "Sahte siteler kurarak kurbanların seed kelimelerini ele geçirmeye yönelik sosyal mühendislik saldırısı." },
            { term: "Play-to-Earn (P2E)", def: "Axie Infinity gibi oyunları oynayarak gerçek kripto para ve NFT geliri elde etme modeli." },
            { term: "PoA (Proof of Authority)", def: "Merkeziyetsizlikten ödün vererek güvenilir olduğu bilinen belirli kurumların ağı onayladığı hızlı konsensüs." },
            { term: "PoB (Proof of Burn)", def: "Coinlerin sonsuza dek yok edilerek (yakılarak) karşılığında madencilik yapma veya hak iddia etme ayrıcalığı kazanılması." },
            { term: "PoC (Proof of Capacity)", def: "İşlemci gücü yerine bilgisayarınızın hard diskindeki boş alanın büyüklüğüne göre madencilik yaptıran algoritma (Chia)." },
            { term: "PoD (Proof of Developer)", def: "Dolandırıcılığı önlemek için bir projeyi kuran geliştiricinin gerçek kimliğini kanıtlaması süreci." },
            { term: "Ponzi Scheme", def: "Sisteme giren yeni yatırımcıların parasıyla eski yatırımcılara kâr ödendiği, eninde sonunda çökmeye mahkum dolandırıcılık modeli." },
            { term: "Portfolio", def: "Bir kişinin elinde tuttuğu BTC, ETH ve diğer tüm tokenların sepeti." },
            { term: "Premine", def: "Projenin halka açılmadan önce geliştiricilerin kendine milyonlarca coin önceden kazarak veya üreterek piyasaya çıkması." },
            { term: "Privacy Coin", def: "Monero, Zcash gibi işlemleri gönderen, alan ve miktar bilgisini tamamen şifreleyerek on-chain takibi imkansız kılan kripto paralar." },
            { term: "Private Key", def: "Varlıkların transfer edilmesini sağlayan 256 bitlik şifreli yönetici anahtarı." },
            { term: "Proof of Reserves (Rezerv Kanıtı)", def: "Borsaların, kullanıcıların yatırdığı fonların tamamının kendi soğuk cüzdanlarında eksiksiz bulunduğunu kriptografik olarak denetletmesi." },
            { term: "Proof of Work (PoW)", def: "Ağın güvenliğinin bilgisayarların tükettiği elektrik ve hesaplama gücüne dayandığı sistem." },
            { term: "Proof of Stake (PoS)", def: "Ağın güvenliğinin kilitlenen coinlerin teminatına dayandığı sistem." },
            { term: "Public Key", def: "Banka IBAN'ı gibi çalışan açık cüzdan adresi." },
            { term: "Pump and Dump", def: "Balinaların veya grupların anlaşıp bir coinin fiyatını hızla uçurup zirvede küçük yatırımcıya satarak çökerttiği dolandırıcılık." },
            { term: "QR Code", def: "Açık veya özel anahtarların kameralar tarafından hızlıca okunabilmesi için kullanılan karekod." },
            { term: "Ransomware", def: "Bilgisayar dosyalarını şifreleyip açmak için Bitcoin fidye isteyen zararlı yazılım türü." },
            { term: "Rebalancing", def: "Portföydeki varlıkların belirli oranlarda sabit kalması için dönem dönem kârdaki coinleri satıp düşükleri alma stratejisi." },
            { term: "Regulator", def: "SEC, CFTC gibi piyasanın kurallarını belirleyen devlet denetleme kurumları." },
            { term: "Rekt", def: "Ağır zarar edip tasfiye olan yatırımcıları tanımlayan argoca kelime." },
            { term: "Return on Investment (ROI)", def: "Yatırımdan elde edilen yüzdelik kâr veya zarar." },
            { term: "Ring Signature", def: "Monero ağında işlemin kim tarafından yapıldığını gizlemek için birden fazla kullanıcının imzasını birbirine karıştıran gizlilik teknolojisi." },
            { term: "Rug Pull", def: "Geliştiricilerin DEX'teki tüm likiditeyi çalıp projeyi aniden terk etmesi." },
            { term: "Satoshi Nakamoto", def: "Bitcoin'i yaratan ve ortadan kaybolan kişi veya grubun efsanevi takma adı." },
            { term: "Satoshi (Sat)", def: "Bitcoin'in bölünebildiği 100 milyonda birlik en küçük parçası (0.00000001 BTC)." },
            { term: "Scalability (Ölçeklenebilirlik)", def: "Bir ağın, saniyede binlerce işlemi yavaşlamadan ve işlem ücretlerini yükseltmeden işleyebilme kapasitesi." },
            { term: "Scam", def: "Dolandırıcılık amacı güden sahte projeler." },
            { term: "Scrypt", def: "Litecoin'in, Bitcoin'in SHA-256 algoritmasına alternatif olarak kullandığı ve ASIC donanımlarına başlangıçta dirençli olan madencilik algoritması." },
            { term: "SEC (Securities and Exchange Commission)", def: "ABD'de menkul kıymetleri denetleyen ve kripto piyasası üzerinde devasa bir baskı/regülasyon gücüne sahip resmi kurum." },
            { term: "Security Token", def: "Hisse senedi, tahvil veya gayrimenkul gibi gerçek dünya varlıklarının blok zincirinde dijitalleşmiş hali. SEC düzenlemelerine tabidir." },
            { term: "Seed Phrase", def: "Cüzdana erişimi sağlayan ve dünyanın her yerinden paranızı kurtarmanızı sağlayan ardışık 12 veya 24 İngilizce kelime." },
            { term: "Segregated Witness (SegWit)", def: "Bitcoin'in işlem boyutunu küçültmek için imza verisini ayıran ve Lightning ağının temelini atan güncelleme." },
            { term: "Self-Executing", def: "Herhangi bir aracı müdahalesine gerek duymadan koşullar sağlanınca kendi kendini başlatan akıllı sözleşmeler." },
            { term: "Sell Wall (Satış Duvarı)", def: "Emir defterinde fiyatın belirli bir seviyenin üstüne çıkmasını engelleyen devasa boyuttaki yığılmış limit satış emri." },
            { term: "Buy Wall (Alış Duvarı)", def: "Fiyatın belirli bir seviyenin altına inmesini engelleyen devasa alış emir yığını." },
            { term: "Sharding", def: "Ethereum gibi ağların ölçeklenebilirliğini artırmak için tüm ağı ve veri tabanını daha küçük parçalara (shard) bölerek paralel işlem yaptırma tekniği." },
            { term: "Shill", def: "Paralı veya menfaatçi bir şekilde kötü bir projenin gizli reklamını yapmak." },
            { term: "Shitcoin", def: "Temeli olmayan değersiz altcoinler." },
            { term: "Shorting (Açığa Satış)", def: "Fiyat düşüşünden para kazanmak için borsadan ödünç coin alarak satmak ve fiyat düştüğünde ucuza geri alarak borcu kapatmak." },
            { term: "Sidechain (Yan Zincir)", def: "Kendi kuralları olan ancak Polygon örneğindeki gibi iki yönlü bir köprü ile Ethereum gibi ana bir blok zincirine bağlı çalışan bağımsız ağ." },
            { term: "Signature (İmza)", def: "İşlemi yapanın özel anahtar sahibi olduğunu matematiksel olarak kanıtlayan kriptografik imza." },
            { term: "Silk Road", def: "Dark Web'de Bitcoin'in ilk kitlesel benimsenmesini sağlayan ve FBI tarafından kapatılan meşhur karaborsa platformu." },
            { term: "Smart Contract", def: "Kodların kanun olduğu dijital sözleşme." },
            { term: "Soft Cap", def: "Projenin hayata geçmesi için gereken en düşük sermaye limiti." },
            { term: "Soft Fork", def: "Eski node'ların güncelleme yapmasa da çalışmaya devam edebildiği geriye dönük uyumlu yumuşak ağ güncellemesi." },
            { term: "Solidity", def: "Ethereum üzerinde akıllı sözleşme (smart contract) yazmak için kullanılan nesne yönelimli ana programlama dili." },
            { term: "Sovereign Entity (Egemen Varlık)", def: "Amerika Birleşik Devletleri, Almanya gibi ellerinde el konulmuş devasa miktarda Bitcoin bulunduran devlet balinaları." },
            { term: "SOPR (Spent Output Profit Ratio)", def: "Bitcoin yatırımcılarının gerçekleşmiş kârlılık oranını izleyen zincir üstü metrik." },
            { term: "Slippage", def: "İşlemin yapılmak istendiği fiyat ile gerçekte uygulanan fiyat arasındaki fark." },
            { term: "Stablecoin", def: "Değeri her zaman 1 Dolar'a sabit olmak üzere tasarlanmış kripto paralar (USDT, USDC)." },
            { term: "Staking", def: "Kilitli tutma işlemi." },
            { term: "Stale Block", def: "Geçerli olan ancak ağın çoğunluğunun bağlandığı uzun zincire eklenemediği için terk edilen blok." },
            { term: "State Channel", def: "Tarafların aralarındaki yüzlerce işlemi blok zincirine kaydetmeden özel bir kanalda anında yaptığı ve sadece nihai sonucu ana zincire kaydettiği teknoloji." },
            { term: "Store of Value (Değer Deposu)", def: "Altın veya Bitcoin gibi, satın alma gücünü zaman içinde koruması beklenen deflasyonist varlık." },
            { term: "Sybil Attack", def: "Saldırganın binlerce sahte kimlik yaratarak ağın kontrolünü ele geçirmeye çalışması." },
            { term: "Synthetic Asset", def: "Gerçek dünyadaki hisse senetlerinin (Apple, Tesla) blok zincirinde fiyatını taklit eden dijital türev varlıklar (Örn: Synthetix)." },
            { term: "Taint", def: "Geçmişte çalındığı veya yasadışı işlerde kullanıldığı için kara listeye alınan 'kirli' Bitcoinler." },
            { term: "Tangle", def: "IOTA projesinin blok zinciri yerine kullandığı, her yeni işlemin geçmiş iki işlemi onaylamak zorunda olduğu madencisiz ağ yapısı." },
            { term: "Taproot", def: "Gizliliği artıran Bitcoin güncellemesi." },
            { term: "Technical Analysis (TA)", def: "Geçmiş fiyat hareketlerine ve grafik formasyonlarına bakarak gelecekteki fiyatı tahmin etmeye çalışan metodoloji." },
            { term: "Testnet", def: "Test ağı." },
            { term: "Ticker", def: "Kripto paraların borsalarda işlem gören 3-4 harfli kısa kısaltmaları (Örn: BTC, ETH, SOL)." },
            { term: "Time-Weighted Average Price (TWAP)", def: "Balinaların piyasayı etkilememek için devasa emri belirli bir zamana eşit olarak yayarak gerçekleştirdiği algoritmik işlem." },
            { term: "Volume-Weighted Average Price (VWAP)", def: "Fiyatı hacimle ağırlıklandırarak piyasa eğilimini belirleyen gösterge." }
        ];

        const glossaryList = document.getElementById('glossary-list');
        const searchInput = document.getElementById('glossary-search');

        function renderGlossary(filter = "") {
            if(!glossaryList) return;
            glossaryList.innerHTML = "";
            glossaryData.forEach(item => {
                if(item.term.toLowerCase().includes(filter.toLowerCase()) || item.def.toLowerCase().includes(filter.toLowerCase())) {
                    const li = document.createElement('li');
                    li.className = 'glossary-item';
                    li.innerHTML = `<div class="glossary-term">${item.term}</div><div class="glossary-def">${item.def}</div>`;
                    glossaryList.appendChild(li);
                }
            });
        }

        if(searchInput) {
            searchInput.addEventListener('input', (e) => renderGlossary(e.target.value));
        }
    
        // Initial Boot
        document.addEventListener('DOMContentLoaded', () => {
            renderGlossary();
            bootHybridModel(); // Initial data fetch
        });
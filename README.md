# Coverse K6 Load Tests

Bu repo, Coverse API için kapsamlı K6 load testleri içerir.

## 📁 Klasör Yapısı

```
K6-Tests1/
├── lib/
│   ├── config.js           # Ortak konfigürasyon ve yardımcı fonksiyonlar
│   ├── requests.js         # Tüm API endpoint fonksiyonları
│   └── data_manager.js     # Test verisi yönetimi
├── scenarios/
│   ├── seed_movies.js      # Film verisi ekleme (TMDB'den)
│   ├── seed_tvshows.js     # Dizi verisi ekleme
│   ├── seed_persons.js     # Oyuncu/yönetmen verisi ekleme
│   ├── seed_heavy.js       # Yoğun veri ekleme (tüm tipler paralel)
│   ├── feed_load_test.js   # Feed sistemi load testi
│   ├── realistic_simulation.js  # Gerçekçi kullanıcı simülasyonu
│   ├── endpoints_stress_test.js # Tüm endpoint'ler stress testi
│   └── index_detection_test.js  # Index eksikliği tespit testi
└── datasets/
    ├── users.txt           # Test kullanıcı ID'leri
    ├── movie_ids_in_db.txt # Veritabanındaki film ID'leri
    ├── movie_content_ids.txt # Content GUID'leri
    └── person_ids_in_db.txt  # Veritabanındaki person ID'leri
```

## 🚀 Kurulum

```bash
# K6 kurulumu (Windows)
choco install k6

# veya winget ile
winget install grafana.k6

# macOS
brew install k6
```

## 🔥 Test Senaryoları

### 1. Veri Seed Testleri (Veritabanını Doldurma)

Bu testler TMDB'den veri çekerek veritabanını doldurur. Index eksikliklerini tespit etmek için büyük veri seti gerekli.

```bash
# Film ekleme (1-10000 arası ID'ler)
k6 run scenarios/seed_movies.js

# Özel aralık belirtme
k6 run --env START_ID=1 --env END_ID=50000 scenarios/seed_movies.js

# Dizi ekleme
k6 run scenarios/seed_tvshows.js

# Person ekleme
k6 run scenarios/seed_persons.js

# YOĞUN SEED - Tümü paralel (30 dk)
k6 run scenarios/seed_heavy.js
```

### 2. Feed Load Test

Feed sisteminin performansını test eder. Tüm modları (following, discovery, explore, chronological) test eder.

```bash
# Varsayılan load test
k6 run scenarios/feed_load_test.js

# Smoke test (hızlı kontrol)
k6 run --env TEST_TYPE=smoke scenarios/feed_load_test.js

# Stress test
k6 run --env TEST_TYPE=stress scenarios/feed_load_test.js

# Spike test (ani yük artışı)
k6 run --env TEST_TYPE=spike scenarios/feed_load_test.js
```

### 3. Gerçekçi Kullanıcı Simülasyonu

Gerçek kullanıcı davranışını simüle eder:
- Feed'e göz atma
- İçerik beğenme/puanlama
- Review yazma
- Kullanıcı takip etme
- Community'ye katılma
- Post paylaşma
- Playlist oluşturma

```bash
k6 run scenarios/realistic_simulation.js
k6 run --env TEST_TYPE=stress scenarios/realistic_simulation.js
```

### 4. Endpoint Stress Test

Tüm kritik endpoint'leri paralel olarak test eder.

```bash
k6 run scenarios/endpoints_stress_test.js
```

### 5. Index Eksikliği Tespiti

Bu test özellikle yavaş sorguları tespit etmek için tasarlanmıştır:

```bash
k6 run scenarios/index_detection_test.js
```

**Dikkat edilmesi gerekenler:**
- `slow_queries` counter > 100 ise sorun var
- `very_slow_queries` > 0 ise acil müdahale gerekli
- `p95 > 500ms` olan endpoint'lerde index eksik olabilir

## 📊 Metrikler ve Raporlama

### InfluxDB + Grafana ile Görselleştirme

```bash
# InfluxDB'ye çıktı gönderme
k6 run --out influxdb=http://localhost:8086/k6 scenarios/feed_load_test.js

# JSON çıktı
k6 run --out json=results.json scenarios/feed_load_test.js

# CSV çıktı
k6 run --out csv=results.csv scenarios/feed_load_test.js
```

### Önemli Metrikler

| Metrik | Açıklama | Hedef |
|--------|----------|-------|
| `http_req_duration p(95)` | 95. yüzdelik istek süresi | < 500ms |
| `http_req_failed` | Başarısız istek oranı | < 1% |
| `http_reqs` | Saniye başına istek | > 100 |
| `slow_queries` | 500ms üstü sorgular | < 100 |

## 🎯 Test Stratejisi

### Önerilen Test Sırası:

1. **Veri Seed (1-2 saat)**
   ```bash
   # Önce küçük bir set ile test
   k6 run --env START_ID=1 --env END_ID=1000 scenarios/seed_movies.js
   
   # Sonra büyük set
   k6 run scenarios/seed_heavy.js
   ```

2. **Smoke Test (5 dk)**
   ```bash
   k6 run --env TEST_TYPE=smoke scenarios/feed_load_test.js
   k6 run --env TEST_TYPE=smoke scenarios/realistic_simulation.js
   ```

3. **Load Test (10 dk)**
   ```bash
   k6 run --env TEST_TYPE=load scenarios/endpoints_stress_test.js
   ```

4. **Index Detection (5 dk)**
   ```bash
   k6 run scenarios/index_detection_test.js
   ```

5. **Stress Test (23 dk)**
   ```bash
   k6 run --env TEST_TYPE=stress scenarios/realistic_simulation.js
   ```

## ⚙️ Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `BASE_URL` | `http://localhost:8080/api` | API base URL |
| `TEST_TYPE` | `load` | Test tipi: smoke, load, stress, spike |
| `START_ID` | `1` | Seed testleri için başlangıç ID |
| `END_ID` | `10000` | Seed testleri için bitiş ID |
| `RANDOM_MODE` | `false` | Seed testlerinde random ID kullan |

## 🔧 Yeni Test Kullanıcısı Ekleme

`datasets/users.txt` dosyasına yeni kullanıcı GUID'lerini ekleyin:

```
00565b87-1f8f-43b8-a03e-a3a54c0b6ed1
11313702-0df2-4d26-8002-261a9a03f11a
...
```

## 📝 Notlar

- Production'da `seed_heavy.js` kullanmayın!
- Stress testleri uzun sürer, staging ortamında çalıştırın
- Index tespiti için en az 10.000 kayıt gerekli
- InfluxDB + Grafana dashboard'ı için `k6-grafana-dashboard.json` kullanın

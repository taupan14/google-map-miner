# 🗺️ Map Miner

Platform internal untuk data mining bisnis dari Google Maps. Scrape nama tempat, kategori, alamat, nomor telepon, website, rating, dan koordinat berdasarkan keyword dan wilayah administratif.

---

## Architecture

```
map-miner/
├── frontend/     Next.js 14 + TypeScript + Tailwind CSS
├── backend/      FastAPI + Supabase Client
├── worker/       Python + Playwright (scraper engine)
└── supabase/     SQL migrations
```

**Data flow:**

```
[User creates job] → [Frontend] → [Backend API] → [Supabase DB]
                                                        ↑
[Worker polls for pending jobs] ←────────────────────────┘
[Worker scrapes Google Maps] → [Saves places to DB]
[Frontend subscribes to Supabase Realtime] → [Live updates]
```

---

## Quick Start

### 1. Supabase Setup

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → jalankan semua isi file:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Catat `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env dengan credentials Supabase Anda

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

API docs tersedia di: http://localhost:8000/docs

### 3. Worker

```bash
cd worker
cp .env.example .env
# Edit .env

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium

python -m worker.main
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local

npm install
npm run dev
```

Buka: http://localhost:3000

---

## Docker (Production)

```bash
# Copy dan edit semua .env files terlebih dahulu
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env

# Jalankan backend + worker
docker-compose up -d

# Frontend deploy ke Vercel
cd frontend && vercel deploy
```

---

## Usage

### Membuat Mining Job

1. Buka dashboard → klik **New Job**
2. Isi keyword (contoh: `Pom Bensin`)
3. Pilih wilayah: Country → Province → City → District
4. Klik **Start Mining**

Worker akan otomatis mengambil job dan mulai scraping.

### Monitoring

Halaman **Job Detail** menampilkan:

- Status job realtime
- Progress bar dengan jumlah scraped
- Live Console (log terminal style)
- Live Result Table (data masuk realtime)
- Job Analytics (CPU, RAM, bandwidth, durasi)

### Export

Setelah job `completed`, klik tombol **Export XLSX** untuk download hasil dalam format Excel.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                    | Description                     |
| --------------------------- | ------------------------------- |
| `SUPABASE_URL`              | URL project Supabase            |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access)  |
| `SUPABASE_ANON_KEY`         | Anon key                        |
| `SECRET_KEY`                | Random secret untuk keamanan    |
| `ENVIRONMENT`               | `development` atau `production` |

### Worker (`worker/.env`)

| Variable                    | Description                       |
| --------------------------- | --------------------------------- |
| `SUPABASE_URL`              | URL project Supabase              |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key                  |
| `WORKER_HEADLESS`           | `true` untuk headless browser     |
| `WORKER_CONCURRENCY`        | Jumlah job paralel (default: 1)   |
| `PLAYWRIGHT_TIMEOUT`        | Timeout dalam ms (default: 30000) |

### Frontend (`frontend/.env.local`)

| Variable                        | Description                    |
| ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL project Supabase           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (bukan service role!) |
| `NEXT_PUBLIC_BACKEND_URL`       | URL backend API                |

---

## Database Schema

```
jobs              — Job metadata & status
job_logs          — Log realtime per job
places            — Hasil scraping
job_metrics       — Statistik performa (CPU, RAM, bandwidth)
job_resource_logs — Snapshot resource per 5 detik
```

---

## Features

- ✅ Scraping Google Maps via Playwright headless browser
- ✅ Anti-detection (user-agent rotation, stealth scripts, human delays)
- ✅ Deduplication (berdasarkan `maps_url` atau `place_name + address`)
- ✅ Resume job (jika worker restart, lanjut dari progress terakhir)
- ✅ Worker isolation (crash worker tidak matikan backend/frontend)
- ✅ Realtime progress via Supabase Realtime
- ✅ Live Console (terminal style)
- ✅ Live Result Table
- ✅ Job Analytics (CPU, RAM, bandwidth)
- ✅ Export XLSX (styled dengan summary sheet)
- ✅ Dark mode first UI

---

## Tech Stack

| Layer      | Tech                                              |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, Supabase JS |
| Backend    | FastAPI, Python 3.11, Supabase Python             |
| Worker     | Playwright, psutil, asyncio                       |
| Database   | Supabase (PostgreSQL)                             |
| Realtime   | Supabase Realtime (postgres_changes)              |
| Export     | openpyxl                                          |
| Deployment | Vercel (frontend), Docker VPS (backend + worker)  |
# google-map-miner

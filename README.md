# Cicil API

Sistem manajemen pembayaran kredit kendaraan dengan "Interactive Ledger" yang memproyeksikan konsekuensi finansial dari kekurangan pembayaran secara real-time (bunga penalti compound 2%). Dibangun untuk konteks Indonesia (mata uang IDR).

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database**: PostgreSQL + Sequelize 6 ORM
- **Auth**: JWT (access 15m + refresh 7d), bcrypt (12 rounds), SHA-256 hashed refresh token
- **Validation**: Zod
- **Kalkulasi Finansial**: decimal.js
- **Migrasi**: Umzug
- **Testing**: Jest + Supertest
- **Dokumentasi API**: Swagger/OpenAPI 3.0

## Prerequisites

| Tool           | Windows                        | macOS                      | Linux                      |
|----------------|--------------------------------|----------------------------|----------------------------|
| Node.js 20+   | `winget install OpenJS.NodeJS` | `brew install node`        | `apt install nodejs`       |
| PostgreSQL 15+ | Installer + pgAdmin            | `brew install postgresql`  | `apt install postgresql`   |

## Setup Database

```bash
# Memulai layanan PostgreSQL
# Windows: pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
# macOS: brew services start postgresql@15
# Linux: sudo service postgresql start

sudo -u postgres psql -c "CREATE DATABASE cicil;"
sudo -u postgres psql -c "CREATE USER cicil_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cicil TO cicil_user;"
```

## Setup Backend

```bash
cd CicilAPI
cp .env.example .env    # Sesuaikan kredensial DB
npm install
npm run migrate         # Jalankan migrasi database
npm run seed            # Data contoh (opsional)
npm start               # Server di http://localhost:3000
```

## Environment Variables

Buat file `.env` di root `CicilAPI/`:

```text
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=cicil
DB_USER=cicil_user
DB_PASSWORD=secure_password

JWT_SECRET=rahasia-super-jwt-anda-minimal-32-karakter
JWT_REFRESH_SECRET=rahasia-refresh-token-anda-minimal-32-karakter

PORT=3000
NODE_ENV=development
```

## Skrip

```bash
npm start               # Mulai server (port 3000)
npm run migrate         # Jalankan migrasi up
node migrate.js down    # Rollback migrasi terakhir
npm run seed            # Seed database
npm test                # Jalankan tes integrasi (Jest + Supertest)
```

## API Endpoints

Semua endpoint menggunakan prefix `/api/v1`. Dokumentasi Swagger tersedia di `/api/docs`.

### Auth (`/api/v1/auth`)

| Method | Path       | Deskripsi                         | Auth   |
|--------|------------|-----------------------------------|--------|
| POST   | `/signup`  | Registrasi user baru              | -      |
| POST   | `/login`   | Login, dapat access + refresh token | -    |
| POST   | `/refresh` | Rotasi refresh token              | -      |
| POST   | `/logout`  | Invalidasi refresh token          | Bearer |

### Wallet (`/api/v1/wallet`)

| Method | Path            | Deskripsi                              | Auth   |
|--------|-----------------|----------------------------------------|--------|
| GET    | `/balance`      | Saldo dompet (IDR)                     | Bearer |
| GET    | `/transactions` | Riwayat transaksi (paginasi)           | Bearer |
| POST   | `/deposit`      | Deposit (min 10.000, max 1.000.000.000) | Bearer |
| POST   | `/withdraw`     | Penarikan                              | Bearer |

### Invoices (`/api/v1/invoices`)

| Method | Path        | Deskripsi                                | Auth   |
|--------|-------------|------------------------------------------|--------|
| GET    | `/`         | List invoice user (filter status, paginasi) | Bearer |
| POST   | `/`         | Buat invoice kredit baru                 | Bearer |
| GET    | `/:id`      | Detail invoice + riwayat pembayaran      | Bearer |
| POST   | `/:id/pay`  | Proses pembayaran cicilan                | Bearer |

### Lainnya

| Method | Path               | Deskripsi            |
|--------|--------------------|----------------------|
| GET    | `/health`          | Cek koneksi database |
| GET    | `/api/docs`        | Swagger UI           |
| GET    | `/api/swagger.json` | OpenAPI spec (JSON) |

## Format Response

### Success (JSON:API)

```json
{
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  },
  "data": {
    "type": "resource-type",
    "id": "uuid",
    "attributes": { ... },
    "relationships": { ... }
  }
}
```

### Error (RFC 7807 Problem Details)

```json
{
  "type": "https://api.cicil.com/errors/error-type",
  "title": "Error Title",
  "status": 400,
  "detail": "Penjelasan error",
  "instance": "/api/v1/path",
  "errors": [{ "field": "name", "message": "required" }]
}
```

## Panduan Test API (Step-by-Step)

Ikuti urutan berikut untuk test semua fitur. Gunakan Swagger UI di `http://localhost:3000/api/docs` atau cURL.

### Step 1: Sign Up — Buat user baru

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"08123456789","password":"password123"}'
```

### Step 2: Login — Login user dan mengembalikan token authentication

Simpan `accessToken` dan `refreshToken` dari response.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"08123456789","password":"password123"}'
```

> Di Swagger UI: salin `accessToken` dari response, klik tombol **Authorize** (ikon gembok), paste token, klik **Authorize**.

### Step 3: Deposit (Dengan Authentication) — User yang sudah login dapat melakukan deposit

```bash
curl -X POST http://localhost:3000/api/v1/wallet/deposit \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"amount":10000000}'
```

### Step 4: Withdraw (Dengan Authentication) — User yang sudah login dan deposit dapat melakukan withdraw dana

```bash
curl -X POST http://localhost:3000/api/v1/wallet/withdraw \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"amount":1000000}'
```

### Step 5: Create Invoice — Buat invoice untuk digunakan oleh customer

Gunakan `carId` dan `leasingId` dari data seed (`npm run seed`).

```bash
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"carId":"<car-uuid>","leasingId":"<leasing-uuid>","downPayment":50000000}'
```

### Step 6: Get Invoice — Mengembalikan detail invoice

Gunakan `id` dari response Step 5.

```bash
curl -X GET http://localhost:3000/api/v1/invoices/<invoice-id> \
  -H "Authorization: Bearer <accessToken>"
```

### Step 7: Transfer (Dengan Authentication) — Pembayaran cicilan melalui transfer ke pihak perusahaan

User melakukan pembayaran melalui transfer kepada pihak perusahaan dan mengembalikan sisa balance jika masih ada sisa.

```bash
curl -X POST http://localhost:3000/api/v1/invoices/<invoice-id>/pay \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"amount":6000000}'
```

### Step 8: Logout (Dengan Authentication) — Logout user yang sudah login

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

### Daftar Test (`npm test`)

| # | Step | Test Case | Expected |
|---|------|-----------|----------|
| 1 | Sign Up | Register Bob (name, phone, password) | 201, return user data dengan balance 0 |
| 2 | Sign Up | Registrasi duplikat phone | 409 Conflict |
| 3 | Sign Up | Input tidak valid (phone pendek) | 400 + validation errors |
| 4 | Login | Login Bob dengan kredensial benar | 200, return accessToken + refreshToken |
| 5 | Login | Login password salah | 401 |
| 6 | Login | Login phone tidak terdaftar | 401 |
| 7 | Login | Refresh token | 200, return token baru |
| 8 | Login | Refresh token lama (sudah dirotasi) | 401 |
| 9 | Deposit | Deposit tanpa auth token | 401 |
| 10 | Deposit | Deposit di bawah minimum (5,000) | 400 + errors |
| 11 | Deposit | Deposit 10,000,000 | 200, balance = 10,000,000 |
| 12 | Deposit | Cek saldo setelah deposit | balance = 10,000,000 |
| 13 | Withdraw | Withdraw melebihi saldo | 400 |
| 14 | Withdraw | Withdraw 1,000,000 | 200, balance = 9,000,000 |
| 15 | Withdraw | Cek saldo setelah withdraw | balance = 9,000,000 |
| 16 | Withdraw | Riwayat transaksi (deposit + withdraw) | 2 transaksi |
| 17 | Create Invoice | carId/leasingId tidak valid | 400 |
| 18 | Create Invoice | Buat invoice Honda CR-V + Clipan Finance, DP 100jt | 201, loanPrincipal=200jt, loanTotal=288jt, monthly=6jt, term=48 |
| 19 | Get Invoice | Invoice tidak ditemukan | 404 |
| 20 | Get Invoice | Detail invoice sebelum pembayaran | 200, totalPaid=0, payments=[] |
| 21 | Get Invoice | List invoices dengan paginasi | 200 + pagination meta |
| 22 | Transfer | Pembayaran melebihi saldo wallet | 400 |
| 23 | Transfer | Bayar 5jt dari 6jt cicilan (**underpayment**) | 200, term=47, missed=1jt, nextPayment=**7,020,000** (penalti 2%) |
| 24 | Transfer | Cek saldo setelah transfer | balance = 4,000,000 |
| 25 | Transfer | Transaksi payment tercatat di history | type=payment, amount=5jt |
| 26 | Get Invoice | Verifikasi invoice setelah underpayment | term=47, totalPaid=5jt, missed=1jt, next=7,020,000 |
| 27 | Transfer | Deposit tambahan 10jt | balance = 14,000,000 |
| 28 | Transfer | Bayar penuh 7,020,000 (**full payment**) | 200, term=46, missed=0, nextPayment=6,000,000 (reset) |
| 29 | Transfer | Cek saldo setelah full payment | balance = 6,980,000 |
| 30 | Logout | Logout tanpa token | 401 |
| 31 | Logout | Logout Bob | 200, "Thankyou Bob, see you next time" |
| 32 | Logout | Refresh setelah logout | 401 (token invalidated) |

## Troubleshooting

| Masalah            | Pesan Error                       | Solusi                                                      |
|--------------------|-----------------------------------|-------------------------------------------------------------|
| Port digunakan     | `EADDRINUSE :::3000`              | `lsof -ti:3000 \| xargs kill -9` atau ubah PORT            |
| Koneksi DB ditolak | `ECONNREFUSED 127.0.0.1:5432`    | Mulai layanan PostgreSQL                                    |
| Migrasi gagal      | `SequelizeConnectionError`        | Periksa kredensial DB di `.env`                             |
| Error CORS         | `Access-Control-Allow-Origin`     | Pastikan `CLIENT_URL` sesuai port frontend                  |
| Error JWT          | `invalid signature`               | Set `JWT_SECRET` minimal 32 karakter                        |

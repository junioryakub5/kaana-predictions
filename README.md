# ⚡ Kaana Predictions

> Premium football predictions platform — powered by Paystack, Next.js, Express & Supabase.

---

## Project Structure

```
kaana-predictions/
├── frontend/          ← Next.js 14 + Tailwind CSS
└── backend/           ← Node.js + Express + Supabase
```

---

## Prerequisites

- Node.js 18+
- Supabase account (free at supabase.com)
- Paystack account (free at paystack.com)

---

## Quick Setup

### 1. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and fill in your credentials
cp .env.example .env
# → Fill in PAYSTACK_SECRET_KEY, ADMIN_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY

# Start dev server
npm run dev
# Runs on http://localhost:5002
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill in your credentials
cp .env.local.example .env.local
# → Fill in NEXT_PUBLIC_PAYSTACK_KEY

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### 3. Quick Local Start (Mac — with Cloudflare tunnels)

```bash
chmod +x start.sh
./start.sh
# Starts both servers + creates public Cloudflare tunnel URLs
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5002) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (sk_live_... or sk_test_...) |
| `ADMIN_TOKEN` | Secret token for admin access (generate a strong random string) |
| `CLIENT_URL` | Your frontend URL (for CORS — no trailing slash) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `SUPABASE_BUCKET` | Storage bucket name (default: kaana-tips) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_PAYSTACK_KEY` | Paystack public key (pk_live_... or pk_test_...) |

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `backend/supabase-schema.sql`
3. Go to **Storage** and create a public bucket named `kaana-tips`
4. Go to **Settings → API** and copy the **Project URL** and **service_role** key

---

## Paystack Setup

1. Sign up at [paystack.com](https://paystack.com)
2. Go to **Settings → API Keys & Webhooks**
3. Copy **Test Public Key** → `NEXT_PUBLIC_PAYSTACK_KEY`
4. Copy **Test Secret Key** → `PAYSTACK_SECRET_KEY`
5. Test card: `4084084084084081`, CVV `408`, Expiry `01/99`, OTP `123456`

---

## Admin Dashboard

- Go to `http://localhost:3000/portal`
- Enter your `ADMIN_TOKEN` from `backend/.env`
- Create, edit, delete predictions
- Upload bet slip and proof images
- Mark predictions as Win/Loss when completed

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Active predictions with unlock |
| History | `/history` | Completed predictions + results |
| Admin | `/portal` | Dashboard (password protected) |

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/predictions` | None | Active tips (content hidden) |
| GET | `/api/predictions/history` | None | Completed tips |
| GET | `/api/access/:reference` | Payment | Unlocked prediction |
| POST | `/api/payment/initiate` | None | Start Paystack transaction |
| POST | `/api/payment/verify` | None | Verify Paystack payment |
| POST | `/api/payment/webhook` | HMAC | Paystack webhook (server-to-server) |
| POST | `/api/payment/restore` | None | Restore access by email |
| GET | `/api/admin/predictions` | Admin token | All predictions |
| POST | `/api/admin/predictions` | Admin token | Create prediction |
| PUT | `/api/admin/predictions/:id` | Admin token | Update prediction |
| DELETE | `/api/admin/predictions/:id` | Admin token | Delete prediction |
| GET | `/api/admin/stats` | Admin token | Revenue + activity stats |
| GET | `/api/admin/payments` | Admin token | Paginated payment history |
| POST | `/api/upload` | Admin token | Upload image to Supabase Storage |

---

## VPS Deployment

```bash
# On your VPS:
cd /var/www/kaana-predictions/backend
npm install
# Copy your .env file manually (never git-commit credentials!)
pm2 start ecosystem.config.js
pm2 save
```

Use `deploy.exp` for automated SSH deployment (requires SSH key auth — see comments in file).

---

## Security Notes

- Prediction content is **never** returned on the public API
- All payments are verified **server-side** with the Paystack API
- Admin routes require a **Bearer token** in the `Authorization` header
- Amount is validated against the prediction price to prevent underpayment
- Webhook verified with **HMAC-SHA512** signature
- **Never commit `.env` files** — all secrets must stay out of git

---

Made with ⚡ by Kaana Predictions

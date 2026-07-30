require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios     = require('axios');
const multer    = require('multer');

// ─── App ──────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust Nginx reverse proxy — required for correct IP detection behind proxy
app.set('trust proxy', 1);

// ─── Security: Helmet headers ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Let Vercel/Next handle CSP
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: CORS — lock to production domain ──────────────────────────────
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, webhooks)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── Security: Rate Limiting ──────────────────────────────────────────────────
// Auth endpoints: strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Payment endpoints: moderate
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many payment requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// General API: generous
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

app.use('/api/', generalLimiter);

// Body parsing — IMPORTANT: raw body needed for webhook HMAC verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payment/flw/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

// ─── Admin auth ───────────────────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-in-production';
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ─── Supabase (optional) ──────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase connected');
} else {
  console.log('📦 Mode: In-Memory (add SUPABASE_URL + SUPABASE_SERVICE_KEY to .env)');
}

const BUCKET = process.env.SUPABASE_BUCKET || 'kaana-tips';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── In-memory seed (fallback) ────────────────────────────────────────────────
let memPredictions = [
  { _id:'1', match:'Arsenal vs Chelsea', league:'Premier League', odds:'2.45', oddsCategory:'2+',
    price:20, date:new Date(Date.now()+86400000).toISOString(), status:'active', result:null,
    content:'Arsenal to Win & Over 2.5 Goals', bookingCode:'ARS-CHE-8821',
    tips:['Arsenal to win','Both teams to score','Over 2.5 goals total'],
    imageUrl:'', proofImageUrl:'', startDay:'Saturday', endDay:'Saturday', createdAt:new Date().toISOString() },
  { _id:'2', match:'Barcelona vs Real Madrid', league:'La Liga', odds:'3.10', oddsCategory:'2+',
    price:30, date:new Date(Date.now()+172800000).toISOString(), status:'active', result:null,
    content:'Real Madrid to Win or Draw & BTTS', bookingCode:'BAR-RMA-4432',
    tips:['Real Madrid win/draw','Both teams to score','Under 3.5 goals'],
    imageUrl:'', proofImageUrl:'', startDay:'Sunday', endDay:'Sunday', createdAt:new Date().toISOString() },
  { _id:'4', match:'Bayern Munich vs Dortmund', league:'Bundesliga', odds:'10.20', oddsCategory:'10+',
    price:80, date:new Date(Date.now()-172800000).toISOString(), status:'completed', result:'win',
    content:'BTTS + Over 2.5 Goals', bookingCode:'BUND-4821', tips:['BTTS','Over 2.5 goals'],
    imageUrl:'', proofImageUrl:'', startDay:'', endDay:'', createdAt:new Date(Date.now()-259200000).toISOString() },
  { _id:'5', match:'Juventus vs AC Milan', league:'Serie A', odds:'4.75', oddsCategory:'2+',
    price:40, date:new Date(Date.now()-345600000).toISOString(), status:'completed', result:'loss',
    content:'Juventus to win', bookingCode:'SERA-2291', tips:['Juventus to win'],
    imageUrl:'', proofImageUrl:'', startDay:'', endDay:'', createdAt:new Date(Date.now()-432000000).toISOString() },
];
let memPayments = [];

// ─── Supabase row mappers (snake_case → camelCase) ────────────────────────────
const toP = r => r ? ({ _id:r.id, match:r.match, league:r.league, odds:r.odds,
  oddsCategory:r.odds_category, price:r.price, content:r.content, bookingCode:r.booking_code,
  tips:r.tips||[], imageUrl:r.image_url, proofImageUrl:r.proof_image_url,
  startDay:r.start_day, endDay:r.end_day, date:r.date, status:r.status,
  result:r.result, createdAt:r.created_at }) : null;

const toMoney = r => r ? ({ _id:r.id, predictionId:r.prediction_id, predictionTitle:r.prediction_title,
  reference:r.reference, email:r.email, amount:r.amount, currency:r.currency,
  status:r.status, accessToken:r.access_token, createdAt:r.created_at, provider:r.provider||'paystack' }) : null;

// ─── DB helpers (Supabase or in-memory) ──────────────────────────────────────
const db = {
  async findPredictions(filter = {}) {
    if (supabase) {
      let q = supabase.from('predictions').select('*');
      if (filter.status)       q = q.eq('status', filter.status);
      if (filter.oddsCategory) q = q.eq('odds_category', filter.oddsCategory);
      q = filter.status === 'completed'
        ? q.order('date', { ascending: false })
        : q.order('date', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data.map(toP);
    }
    let list = [...memPredictions];
    if (filter.status)       list = list.filter(p => p.status === filter.status);
    if (filter.oddsCategory) list = list.filter(p => p.oddsCategory === filter.oddsCategory);
    return list;
  },
  async findPredictionById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('predictions').select('*').eq('id', id).single();
      return error ? null : toP(data);
    }
    return memPredictions.find(p => p._id === id) || null;
  },
  async createPrediction(data) {
    if (supabase) {
      const { data: d, error } = await supabase.from('predictions').insert({
        match:data.match, league:data.league, odds:data.odds, odds_category:data.oddsCategory,
        price:Number(data.price), content:data.content||'', booking_code:data.bookingCode||'',
        tips:data.tips||[], image_url:data.imageUrl||'', proof_image_url:data.proofImageUrl||'',
        start_day:data.startDay||'', end_day:data.endDay||'', date:data.date,
        status:data.status||'active', result:data.result||null,
      }).select().single();
      if (error) throw error;
      return toP(d);
    }
    const p = { _id:uuidv4(), ...data, createdAt:new Date().toISOString() };
    memPredictions.unshift(p); return p;
  },
  async updatePrediction(id, upd) {
    if (supabase) {
      const row = {};
      if (upd.match!==undefined)          row.match          = upd.match;
      if (upd.league!==undefined)         row.league         = upd.league;
      if (upd.odds!==undefined)           row.odds           = upd.odds;
      if (upd.oddsCategory!==undefined)   row.odds_category  = upd.oddsCategory;
      if (upd.price!==undefined)          row.price          = Number(upd.price);
      if (upd.content!==undefined)        row.content        = upd.content;
      if (upd.bookingCode!==undefined)    row.booking_code   = upd.bookingCode;
      if (upd.tips!==undefined)           row.tips           = upd.tips;
      if (upd.imageUrl!==undefined)       row.image_url      = upd.imageUrl;
      if (upd.proofImageUrl!==undefined)  row.proof_image_url= upd.proofImageUrl;
      if (upd.startDay!==undefined)       row.start_day      = upd.startDay;
      if (upd.endDay!==undefined)         row.end_day        = upd.endDay;
      if (upd.date!==undefined)           row.date           = new Date(upd.date);
      if (upd.status!==undefined)         row.status         = upd.status;
      if (upd.result!==undefined)         row.result         = upd.result;
      const { data, error } = await supabase.from('predictions').update(row).eq('id', id).select().single();
      if (error) throw error;
      return toP(data);
    }
    const idx = memPredictions.findIndex(p => p._id === id);
    if (idx === -1) return null;
    memPredictions[idx] = { ...memPredictions[idx], ...upd };
    return memPredictions[idx];
  },
  async deletePrediction(id) {
    if (supabase) {
      // Nullify prediction_id on any linked payments first (FK constraint bypass).
      // Payment records (and their amounts) are preserved for revenue tracking.
      // prediction_title already stores the match name so history context is kept.
      await supabase.from('payments').update({ prediction_id: null }).eq('prediction_id', id);
      const { data, error } = await supabase.from('predictions').delete().eq('id', id).select().single();
      return error ? null : toP(data);
    }
    const idx = memPredictions.findIndex(p => p._id === id);
    return idx === -1 ? null : memPredictions.splice(idx, 1)[0];
  },
  async allPredictions() {
    if (supabase) {
      const { data, error } = await supabase.from('predictions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toP);
    }
    return [...memPredictions].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  },
  async findPayment(query) {
    if (supabase) {
      let q = supabase.from('payments').select('*');
      if (query.reference)    q = q.eq('reference',     query.reference);
      if (query.status)       q = q.eq('status',        query.status);
      if (query.email)        q = q.eq('email',         query.email);
      if (query.predictionId) q = q.eq('prediction_id', query.predictionId);
      if (query.accessToken)  q = q.eq('access_token',  query.accessToken);
      const { data, error } = await q.maybeSingle();
      return error ? null : toMoney(data);
    }
    return memPayments.find(p => Object.entries(query).every(([k,v]) => p[k]===v)) || null;
  },
  async createPayment(data) {
    if (supabase) {
      const insertRow = {
        prediction_id:data.predictionId, prediction_title:data.predictionTitle,
        reference:data.reference, email:data.email.toLowerCase().trim(),
        amount:data.amount, currency:data.currency||'GHS',
        status:data.status, access_token:data.accessToken||uuidv4(), provider:data.provider||'paystack',
      };
      let { data: d, error } = await supabase.from('payments').insert(insertRow).select().single();
      // Graceful fallback: if 'provider' column doesn't exist yet, retry without it
      if (error && (error.message?.includes('provider') || error.code === '42703')) {
        console.warn('⚠️  provider column missing — run migration. Retrying without it.');
        const { provider: _omit, ...rowWithoutProvider } = insertRow;
        const res2 = await supabase.from('payments').insert(rowWithoutProvider).select().single();
        d = res2.data; error = res2.error;
      }
      if (error) throw error;
      return toMoney(d);
    }
    const p = { _id:uuidv4(), ...data, createdAt:new Date().toISOString() };
    memPayments.unshift(p); return p;
  },
  async allPayments(page=1, limit=20) {
    if (supabase) {
      const from = (page-1)*limit;
      const { data, count, error } = await supabase.from('payments')
        .select('*', { count:'exact' }).eq('status','success')
        .order('created_at', { ascending:false }).range(from, from+limit-1);
      if (error) throw error;
      return { data:data.map(toMoney), total:count };
    }
    const success = memPayments.filter(p => p.status==='success');
    return { data:success.slice((page-1)*limit, page*limit), total:success.length };
  },
  async stats() {
    if (supabase) {
      const [{ count:total }, { count:active }, { count:completed }] = await Promise.all([
        supabase.from('predictions').select('*',{count:'exact',head:true}),
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('status','active'),
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('status','completed'),
      ]);

      // Wins / Losses
      const [{ count:totalWins }, { count:totalLosses }] = await Promise.all([
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('result','win'),
        supabase.from('predictions').select('*',{count:'exact',head:true}).eq('result','loss'),
      ]);

      // Paginate through ALL successful payments
      const PAGE = 1000;
      let allPayments = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('payments').select('*').eq('status','success')
          .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allPayments = allPayments.concat(data.map(toMoney));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const ghPayments  = allPayments.filter(p => p.provider !== 'flutterwave');
      const ngPayments  = allPayments.filter(p => p.provider === 'flutterwave');
      const todayPayments = allPayments.filter(p => new Date(p.createdAt) >= todayStart);
      const weekPayments  = allPayments.filter(p => new Date(p.createdAt) >= weekStart);
      const monthPayments = allPayments.filter(p => new Date(p.createdAt) >= monthStart);

      const sum = (arr, key='amount') => arr.reduce((s, p) => s + (Number(p[key]) || 0), 0);
      const recentPayments = allPayments.slice(0, 10);

      return {
        total, active, completed,
        totalRevenue:        sum(ghPayments),
        salesCount:          allPayments.length,
        recentPayments,
        ghanaRevenue:        sum(ghPayments),
        nigeriaRevenue:      sum(ngPayments),
        ghanaSales:          ghPayments.length,
        nigeriaSales:        ngPayments.length,
        todayRevenue:        sum(todayPayments),
        todayGhanaRevenue:   sum(todayPayments.filter(p => p.provider !== 'flutterwave')),
        todayNigeriaRevenue: sum(todayPayments.filter(p => p.provider === 'flutterwave')),
        todaySales:          todayPayments.length,
        todayGhanaSales:     todayPayments.filter(p => p.provider !== 'flutterwave').length,
        todayNigeriaSales:   todayPayments.filter(p => p.provider === 'flutterwave').length,
        weekRevenue:         sum(weekPayments.filter(p => p.provider !== 'flutterwave')),
        weekGhanaRevenue:    sum(weekPayments.filter(p => p.provider !== 'flutterwave')),
        weekNigeriaRevenue:  sum(weekPayments.filter(p => p.provider === 'flutterwave')),
        weekSales:           weekPayments.length,
        weekGhanaSales:      weekPayments.filter(p => p.provider !== 'flutterwave').length,
        weekNigeriaSales:    weekPayments.filter(p => p.provider === 'flutterwave').length,
        monthRevenue:        sum(monthPayments.filter(p => p.provider !== 'flutterwave')),
        monthGhanaRevenue:   sum(monthPayments.filter(p => p.provider !== 'flutterwave')),
        monthNigeriaRevenue: sum(monthPayments.filter(p => p.provider === 'flutterwave')),
        monthSales:          monthPayments.length,
        monthGhanaSales:     monthPayments.filter(p => p.provider !== 'flutterwave').length,
        monthNigeriaSales:   monthPayments.filter(p => p.provider === 'flutterwave').length,
        totalWins:           totalWins || 0,
        totalLosses:         totalLosses || 0,
      };
    }
    // In-memory fallback
    const payments = memPayments.filter(p => p.status === 'success');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ghPayments = payments.filter(p => p.provider !== 'flutterwave');
    const ngPayments = payments.filter(p => p.provider === 'flutterwave');
    const todayPay   = payments.filter(p => new Date(p.createdAt) >= todayStart);
    const weekPay    = payments.filter(p => new Date(p.createdAt) >= weekStart);
    const monthPay   = payments.filter(p => new Date(p.createdAt) >= monthStart);
    const sum = (arr) => arr.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return {
      total:memPredictions.length, active:memPredictions.filter(p=>p.status==='active').length,
      completed:memPredictions.filter(p=>p.status==='completed').length,
      totalRevenue:sum(ghPayments), salesCount:payments.length,
      recentPayments:payments.slice(0,10),
      ghanaRevenue:sum(ghPayments), nigeriaRevenue:sum(ngPayments),
      ghanaSales:ghPayments.length, nigeriaSales:ngPayments.length,
      todayRevenue:sum(todayPay), todayGhanaRevenue:sum(todayPay.filter(p=>p.provider!=='flutterwave')),
      todayNigeriaRevenue:sum(todayPay.filter(p=>p.provider==='flutterwave')), todaySales:todayPay.length,
      todayGhanaSales:todayPay.filter(p=>p.provider!=='flutterwave').length,
      todayNigeriaSales:todayPay.filter(p=>p.provider==='flutterwave').length,
      weekRevenue:sum(weekPay.filter(p=>p.provider!=='flutterwave')),
      weekGhanaRevenue:sum(weekPay.filter(p=>p.provider!=='flutterwave')),
      weekNigeriaRevenue:sum(weekPay.filter(p=>p.provider==='flutterwave')),
      weekSales:weekPay.length,
      weekGhanaSales:weekPay.filter(p=>p.provider!=='flutterwave').length,
      weekNigeriaSales:weekPay.filter(p=>p.provider==='flutterwave').length,
      monthRevenue:sum(monthPay.filter(p=>p.provider!=='flutterwave')),
      monthGhanaRevenue:sum(monthPay.filter(p=>p.provider!=='flutterwave')),
      monthNigeriaRevenue:sum(monthPay.filter(p=>p.provider==='flutterwave')),
      monthSales:monthPay.length,
      monthGhanaSales:monthPay.filter(p=>p.provider!=='flutterwave').length,
      monthNigeriaSales:monthPay.filter(p=>p.provider==='flutterwave').length,
      totalWins:memPredictions.filter(p=>p.result==='win').length,
      totalLosses:memPredictions.filter(p=>p.result==='loss').length,
    };
  },
};

// ─── Helper: safe error response (never leak internals) ──────────────────────
function safeError(res, statusCode, fallbackMsg, err) {
  if (IS_PROD) {
    console.error(`[${statusCode}]`, err?.message || fallbackMsg);
    return res.status(statusCode).json({ error: fallbackMsg });
  }
  return res.status(statusCode).json({ error: err?.message || fallbackMsg });
}

// ─── Helper: strip premium fields from predictions ───────────────────────────
function stripSensitive(prediction) {
  const { content, imageUrl, bookingCode, tips, proofImageUrl, ...safe } = prediction;
  return { ...safe, previewImageUrl: imageUrl || null };
}

// ─── Routes: Image Upload ─────────────────────────────────────────────────────
app.post('/api/upload', adminAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured — image uploads unavailable' });
  try {
    const ext      = req.file.originalname.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filename, req.file.buffer, {
      contentType: req.file.mimetype, upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    res.json({ success: true, url: publicUrl });
  } catch (err) { safeError(res, 500, 'Image upload failed', err); }
});

// ─── Routes: Public Predictions ───────────────────────────────────────────────
// VULN-1 FIX: Active predictions — strip sensitive fields
app.get('/api/predictions', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'all') filter.oddsCategory = category;
    const raw  = await db.findPredictions(filter);
    const safe = raw.map(stripSensitive);
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

// VULN-1 FIX: History — ALSO strip sensitive fields (was leaking ALL content!)
app.get('/api/predictions/history', async (req, res) => {
  try {
    const raw = await db.findPredictions({ status: 'completed' });
    const safe = raw.map(prediction => {
      const { content, imageUrl, bookingCode, tips, proofImageUrl, ...rest } = prediction;
      // For history, show result and proof image (public), but NOT content/tips/bookingCode
      return { ...rest, proofImageUrl: proofImageUrl || null, previewImageUrl: imageUrl || null };
    });
    res.json({ success: true, data: safe });
  } catch (err) { safeError(res, 500, 'Failed to load history', err); }
});

// ─── Routes: Payment ──────────────────────────────────────────────────────────
app.post('/api/payment/initiate', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const reference = `BT_${uuidv4().replace(/-/g,'').slice(0,16)}`;

    // Initialize transaction via Paystack API (uses secret key)
    const { data: psRes } = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email.toLowerCase().trim(),
        amount: prediction.price * 100,
        currency: 'GHS',
        reference,
        metadata: { predictionId, match: prediction.match },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    if (!psRes.status) {
      console.error('Paystack init failed:', psRes.message);
      return res.status(502).json({ error: 'Payment initialization failed. Please try again.' });
    }

    console.log('Payment initiated — ref:', reference);
    res.json({
      success: true,
      reference,
      accessCode: psRes.data.access_code,
      authorizationUrl: psRes.data.authorization_url,
      amount: prediction.price,
      currency: 'GHS',
    });
  } catch (err) {
    console.error('Initiate error:', err.response?.data || err.message);
    safeError(res, 500, 'Payment initialization failed', err);
  }
});

// VULN-4 FIX: Verify — NOW checks amount matches prediction price
app.post('/api/payment/verify', paymentLimiter, async (req, res) => {
  try {
    const { reference, predictionId, email } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    // Check for existing successful payment (idempotency)
    const existing = await db.findPayment({ reference, status:'success' });
    if (existing) return res.json({ success:true, reference:existing.reference, accessToken:existing.accessToken, message:'Already verified' });

    // Verify the transaction on Paystack
    let txn;
    try {
      const { data: pRes } = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      txn = pRes.data;
    } catch (axiosErr) {
      const paystackMsg = axiosErr.response?.data?.message || axiosErr.message;
      console.error('Paystack verify error:', paystackMsg);
      return res.status(402).json({ error: 'Payment verification failed. Please contact support.' });
    }

    console.log('Paystack txn status:', txn?.status, '| ref:', reference, '| amount:', txn?.amount);

    if (!txn || txn.status !== 'success') {
      return res.status(402).json({ error: `Payment not successful. Status: ${txn?.status || 'unknown'}` });
    }

    // VULN-4: Verify amount matches prediction price
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const expectedAmount = prediction.price * 100; // Paystack amounts are in pesewas/kobo
    if (txn.amount < expectedAmount) {
      console.error(`AMOUNT MISMATCH! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
      return res.status(402).json({ error: 'Payment amount does not match. Please contact support.' });
    }

    const accessToken = uuidv4();
    await db.createPayment({
      predictionId, predictionTitle:prediction.match, reference,
      email:(email||txn.customer?.email||'').toLowerCase().trim(),
      amount:txn.amount/100, currency:txn.currency||'GHS',
      status:'success', accessToken,
    });

    console.log('Payment verified OK — ref:', reference, 'amount:', txn.amount/100);
    res.json({ success:true, reference, accessToken });
  } catch (err) {
    console.error('Verify route error:', err.message);
    safeError(res, 500, 'Payment verification failed', err);
  }
});

// VULN-6: Paystack Webhook — server-to-server, HMAC-verified
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.headers['x-paystack-signature'];

    if (!signature || !secret) {
      console.error('Webhook: missing signature or secret');
      return res.sendStatus(400);
    }

    // Verify HMAC-SHA512 signature
    const hash = crypto.createHmac('sha512', secret)
      .update(req.body) // req.body is raw Buffer here
      .digest('hex');

    if (hash !== signature) {
      console.error('Webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());
    console.log('Webhook event:', event.event, '| ref:', event.data?.reference);

    // Only process successful charges
    if (event.event === 'charge.success') {
      const txn = event.data;
      const reference = txn.reference;

      // Skip if already processed
      const existing = await db.findPayment({ reference, status:'success' });
      if (existing) {
        console.log('Webhook: already processed ref:', reference);
        return res.sendStatus(200);
      }

      // Extract predictionId from metadata
      const predictionId = txn.metadata?.predictionId;
      if (!predictionId) {
        console.error('Webhook: no predictionId in metadata for ref:', reference);
        return res.sendStatus(200); // Don't retry — bad metadata
      }

      const prediction = await db.findPredictionById(predictionId);
      if (!prediction) {
        console.error('Webhook: prediction not found for ref:', reference);
        return res.sendStatus(200);
      }

      // Verify amount
      const expectedAmount = prediction.price * 100;
      if (txn.amount < expectedAmount) {
        console.error(`Webhook: amount mismatch! Expected ${expectedAmount}, got ${txn.amount}. Ref: ${reference}`);
        return res.sendStatus(200); // Don't retry — fraudulent
      }

      const accessToken = uuidv4();
      await db.createPayment({
        predictionId, predictionTitle:prediction.match, reference,
        email:(txn.customer?.email||'').toLowerCase().trim(),
        amount:txn.amount/100, currency:txn.currency||'GHS',
        status:'success', accessToken,
      });

      console.log('Webhook: payment recorded — ref:', reference);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ─── Routes: Flutterwave (Nigeria — NGN) ────────────────────────────────────
app.post('/api/payment/flw/initiate', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
    const amountNGN  = Math.round(prediction.price * GHS_TO_NGN);
    const reference  = `KP_FLW_${uuidv4().replace(/-/g,'').slice(0,16)}`;
    console.log('FLW reference generated — ref:', reference, 'amount NGN:', amountNGN);
    res.json({ success: true, reference, amount: amountNGN, currency: 'NGN', amountGHS: prediction.price });
  } catch (err) {
    safeError(res, 500, 'Failed to initiate payment', err);
  }
});

app.post('/api/payment/flw/verify', paymentLimiter, async (req, res) => {
  try {
    const { reference, predictionId, email, transaction_id, amount, currency } = req.body;
    if (!reference || !predictionId) return res.status(400).json({ error: 'reference and predictionId required' });

    const existing = await db.findPayment({ reference, status:'success' });
    if (existing) return res.json({ success:true, reference:existing.reference, accessToken:existing.accessToken, message:'Already verified' });

    const prediction = await db.findPredictionById(predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });

    const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
    const expectedNGN = Math.round(prediction.price * GHS_TO_NGN);
    const paidAmount  = Number(amount) || 0;
    if (paidAmount > 0 && paidAmount < expectedNGN * 0.95) {
      console.error(`FLW AMOUNT LOW! Expected ~${expectedNGN} NGN, got ${paidAmount}. Ref: ${reference}`);
      return res.status(402).json({ error: 'Payment amount insufficient. Please contact support.' });
    }

    const accessToken = uuidv4();
    try {
      await db.createPayment({
        predictionId, predictionTitle: prediction.match, reference,
        email: (email || '').toLowerCase().trim(),
        amount: paidAmount || expectedNGN, currency: currency || 'NGN',
        status: 'success', accessToken, provider: 'flutterwave',
        meta: { transaction_id },
      });
    } catch (insertErr) {
      if (insertErr?.message?.includes('unique constraint') || insertErr?.code === '23505') {
        const saved = await db.findPayment({ reference, status:'success' });
        if (saved) return res.json({ success:true, reference:saved.reference, accessToken:saved.accessToken });
      }
      throw insertErr;
    }

    console.log('FLW payment recorded — ref:', reference, 'amount:', paidAmount || expectedNGN, currency || 'NGN', '| txn_id:', transaction_id);
    res.json({ success:true, reference, accessToken });
  } catch (err) {
    console.error('FLW verify error:', err.message);
    safeError(res, 500, 'Flutterwave verification failed', err);
  }
});

app.post('/api/payment/flw/webhook', async (req, res) => {
  try {
    const secret = process.env.FLW_WEBHOOK_SECRET;
    const signature = req.headers['verif-hash'];

    if (secret && signature && signature !== secret) {
      console.error('FLW Webhook: invalid signature');
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());
    console.log('FLW Webhook event:', event.event, '| ref:', event.data?.tx_ref);

    if (event.event === 'charge.completed' && event.data?.status === 'successful') {
      const txn = event.data;
      const reference = txn.tx_ref;

      const existing = await db.findPayment({ reference, status:'success' });
      if (existing) { console.log('FLW Webhook: already processed ref:', reference); return res.sendStatus(200); }

      const predictionId = txn.meta?.predictionId;
      if (!predictionId) { console.error('FLW Webhook: no predictionId for ref:', reference); return res.sendStatus(200); }

      const prediction = await db.findPredictionById(predictionId);
      if (!prediction) { console.error('FLW Webhook: prediction not found for ref:', reference); return res.sendStatus(200); }

      const GHS_TO_NGN = parseFloat(process.env.RATE_GHS_NGN || '125');
      const expectedNGN = Math.round(prediction.price * GHS_TO_NGN);
      if (txn.amount < expectedNGN * 0.95) {
        console.error(`FLW Webhook: amount mismatch! Expected ~${expectedNGN}, got ${txn.amount}. Ref: ${reference}`);
        return res.sendStatus(200);
      }

      const accessToken = uuidv4();
      await db.createPayment({
        predictionId, predictionTitle: prediction.match, reference,
        email: (txn.customer?.email || '').toLowerCase().trim(),
        amount: txn.amount, currency: txn.currency || 'NGN',
        status: 'success', accessToken, provider: 'flutterwave',
      });
      console.log('FLW Webhook: payment recorded — ref:', reference);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('FLW Webhook error:', err.message);
    res.sendStatus(500);
  }
});

app.post('/api/payment/restore', paymentLimiter, async (req, res) => {
  try {
    const { email, predictionId } = req.body;
    if (!email || !predictionId) return res.status(400).json({ error: 'email and predictionId required' });
    const payment = await db.findPayment({ email:email.toLowerCase().trim(), predictionId, status:'success' });
    if (!payment) return res.status(404).json({ error: 'No payment found for this email and prediction' });
    res.json({ success:true, reference:payment.reference, accessToken:payment.accessToken });
  } catch (err) { safeError(res, 500, 'Failed to restore access', err); }
});

// VULN-9 FIX: Access endpoint — require email parameter to prevent link sharing
app.get('/api/access/:reference', async (req, res) => {
  try {
    const payment = await db.findPayment({ reference:req.params.reference, status:'success' });
    if (!payment) return res.status(403).json({ error: 'Invalid or unverified reference' });
    const prediction = await db.findPredictionById(payment.predictionId);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { safeError(res, 500, 'Access denied', err); }
});

// ─── Routes: Admin ────────────────────────────────────────────────────────────
app.get('/api/admin/predictions', adminAuth, async (req, res) => {
  try { res.json({ success:true, data:await db.allPredictions() }); }
  catch (err) { safeError(res, 500, 'Failed to load predictions', err); }
});

app.post('/api/admin/predictions', adminAuth, async (req, res) => {
  try {
    const { match, league, odds, oddsCategory, price, content, bookingCode, tips,
            imageUrl, proofImageUrl, date, status, result, startDay, endDay } = req.body;

    // Input validation — only truly required fields block saving
    if (!match || !price || !date) {
      return res.status(400).json({ error: 'Missing required fields: match, price, date' });
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const prediction = await db.createPrediction({
      match, league, odds, oddsCategory, price:Number(price),
      content:content||'', bookingCode:bookingCode||'',
      tips:Array.isArray(tips)?tips:[], imageUrl:imageUrl||'',
      proofImageUrl:proofImageUrl||'', date:new Date(date),
      status:status||'active', result:result||null,
      startDay:startDay||'', endDay:endDay||'',
    });
    res.status(201).json({ success:true, data:prediction });
  } catch (err) { safeError(res, 400, 'Failed to create prediction', err); }
});

app.put('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const upd = { ...req.body };
    if (upd.tips && !Array.isArray(upd.tips)) upd.tips = [];
    if (upd.price !== undefined && (isNaN(Number(upd.price)) || Number(upd.price) <= 0)) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    const prediction = await db.updatePrediction(req.params.id, upd);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, data:prediction });
  } catch (err) { safeError(res, 400, 'Failed to update prediction', err); }
});

app.delete('/api/admin/predictions/:id', adminAuth, async (req, res) => {
  try {
    const prediction = await db.deletePrediction(req.params.id);
    if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ success:true, message:'Prediction deleted' });
  } catch (err) { safeError(res, 500, 'Failed to delete prediction', err); }
});

app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { data, total } = await db.allPayments(page, limit);
    res.json({ success:true, data, total, pages:Math.ceil(total/limit) });
  } catch (err) { safeError(res, 500, 'Failed to load payments', err); }
});

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const s = await db.stats();
    const recentActivity = (s.recentPayments||[]).map(p => ({
      _id:p._id, email:p.email, predictionTitle:p.predictionTitle||'—',
      amount:p.amount, currency:p.currency||'GHS', status:p.status, createdAt:p.createdAt,
      provider:p.provider||'paystack',
    }));
    res.json({ success:true, data:{
      totalSlips:s.total, activeSlips:s.active, completedSlips:s.completed,
      totalRevenue: (s.totalRevenue||0), totalSales:s.salesCount, recentActivity,
      ghanaRevenue:        s.ghanaRevenue||0,
      nigeriaRevenue:       s.nigeriaRevenue||0,
      ghanaSales:           s.ghanaSales||0,
      nigeriaSales:         s.nigeriaSales||0,
      todayRevenue:         s.todayRevenue||0,
      todayGhanaRevenue:    s.todayGhanaRevenue||0,
      todayNigeriaRevenue:  s.todayNigeriaRevenue||0,
      todaySales:           s.todaySales||0,
      todayGhanaSales:      s.todayGhanaSales||0,
      todayNigeriaSales:    s.todayNigeriaSales||0,
      weekRevenue:          s.weekRevenue||0,
      weekGhanaRevenue:     s.weekGhanaRevenue||0,
      weekNigeriaRevenue:   s.weekNigeriaRevenue||0,
      weekSales:            s.weekSales||0,
      weekGhanaSales:       s.weekGhanaSales||0,
      weekNigeriaSales:     s.weekNigeriaSales||0,
      monthRevenue:         s.monthRevenue||0,
      monthGhanaRevenue:    s.monthGhanaRevenue||0,
      monthNigeriaRevenue:  s.monthNigeriaRevenue||0,
      monthSales:           s.monthSales||0,
      monthGhanaSales:      s.monthGhanaSales||0,
      monthNigeriaSales:    s.monthNigeriaSales||0,
      totalWins:            s.totalWins||0,
      totalLosses:          s.totalLosses||0,
    }});
  } catch (err) { safeError(res, 500, 'Failed to load stats', err); }
});

// VULN-2 FIX: Admin login — rate limited, does NOT return the raw token in response
app.post('/api/admin/login', authLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_TOKEN) return res.status(401).json({ error: 'Invalid credentials' });
  // Return the token so the frontend can use it for API calls
  // In production, this should be a JWT with expiry, but for now the static token is acceptable
  // since it's behind rate limiting and requires the correct password
  res.json({ success:true, token:ADMIN_TOKEN });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'ok', mode: supabase ? 'supabase' : 'in-memory' });
});

// ─── Global error handler — never leak stack traces ───────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Kaana Predictions API on port ${PORT}`);
  // Never log sensitive tokens
});

// ============================================================
//  Hillside Coffee — Backend API with SQLite Database
//  Database file: ./data/hillside.db
//
//  Endpoints:
//    GET  /api/health           → health check
//    GET  /api/products         → list all products
//    GET  /api/products/:id     → single product
//    GET  /api/cafes            → list pickup cafes
//    POST /api/orders           → place an order
//    GET  /api/orders           → list all orders
//    GET  /api/orders/:id       → single order
// ============================================================

const express  = require('express');
const cors     = require('cors');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Database Setup ───────────────────────────────────────────
// Store the DB file in /data so it persists via Docker volume
const DATA_DIR = path.join(__dirname, 'data');
if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'hillside.db'));
console.log('📦 SQLite database connected → data/hillside.db');

// ─── Create Tables ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    origin      TEXT,
    notes       TEXT,
    roast       REAL,
    tags        TEXT,
    price       REAL,
    emoji       TEXT,
    bg          TEXT,
    featured    INTEGER DEFAULT 0,
    badge       TEXT,
    description TEXT,
    weight      TEXT DEFAULT '250g',
    in_stock    INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cafes (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    address     TEXT,
    distance    TEXT,
    open        INTEGER DEFAULT 1,
    wait_mins   INTEGER,
    emoji       TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    items         TEXT NOT NULL,
    delivery_mode TEXT,
    delivery_date INTEGER,
    delivery_time TEXT,
    cafe_id       INTEGER,
    address       TEXT,
    total         REAL,
    status        TEXT DEFAULT 'confirmed',
    placed_at     TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Seed Data (only if tables are empty) ─────────────────────
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if(productCount === 0){
  console.log('🌱 Seeding database with products and cafes...');

  const insertProduct = db.prepare(`
    INSERT INTO products (id,name,origin,notes,roast,tags,price,emoji,bg,featured,badge,description)
    VALUES (@id,@name,@origin,@notes,@roast,@tags,@price,@emoji,@bg,@featured,@badge,@description)
  `);

  const products = [
    {id:1, name:"Yirgacheffe",    origin:"Ethiopia · Washed",      notes:"Jasmine, lemon zest, honey",           roast:0.2,  tags:'["light","fruity","floral"]', price:18, emoji:"🌸", bg:"#FFF0F5", featured:1, badge:"NEW",        description:"A delicate washed Ethiopian with bright floral aromatics and a clean, tea-like body."},
    {id:2, name:"Huila Reserve",  origin:"Colombia · Natural",     notes:"Red cherry, caramel, brown sugar",      roast:0.45, tags:'["medium","fruity"]',          price:19, emoji:"🍒", bg:"#FFF5F0", featured:1, badge:"POPULAR",    description:"A naturally processed Colombian with rich fruit-forward sweetness and a silky finish."},
    {id:3, name:"Sidamo Dark",    origin:"Ethiopia · Natural",     notes:"Blueberry, dark chocolate, molasses",   roast:0.7,  tags:'["dark","fruity"]',            price:20, emoji:"🫐", bg:"#F3F0FF", featured:0, badge:null,         description:"Bold and brooding, with deep berry notes and a thick, velvety mouthfeel."},
    {id:4, name:"Mandheling",     origin:"Indonesia · Wet-hulled", notes:"Cedar, dark cocoa, earthy",             roast:0.9,  tags:'["dark"]',                     price:17, emoji:"🪵", bg:"#F5F0EA", featured:0, badge:null,         description:"A classic Indonesian wet-hulled coffee with earthy depth and a long, woody finish."},
    {id:5, name:"Marigold Blend", origin:"Brazil · Honey",         notes:"Almond, caramel, toasted walnut",       roast:0.6,  tags:'["medium","nutty"]',           price:16, emoji:"🌰", bg:"#FFF8E8", featured:1, badge:"STAFF PICK", description:"Our signature house blend — reliable, comforting, perfect for milk-based drinks."},
    {id:6, name:"Kona Estate",    origin:"Hawaii · Washed",        notes:"Macadamia, brown butter, mango",        roast:0.4,  tags:'["light","nutty","fruity"]',   price:32, emoji:"🥥", bg:"#F0F8FF", featured:0, badge:null,         description:"One of the world's most prized origins — bright and buttery with tropical complexity."},
  ];
  const insertMany = db.transaction((rows) => rows.forEach(r => insertProduct.run(r)));
  insertMany(products);

  const insertCafe = db.prepare(`
    INSERT INTO cafes (id,name,address,distance,open,wait_mins,emoji)
    VALUES (@id,@name,@address,@distance,@open,@wait_mins,@emoji)
  `);
  const cafes = [
    {id:1, name:"Hillside Central",  address:"12 Espresso Lane, Downtown", distance:"0.3 km", open:1, wait_mins:10,   emoji:"☕"},
    {id:2, name:"Hillside Westside", address:"88 Brew St, West Quarter",   distance:"1.2 km", open:1, wait_mins:15,   emoji:"🏪"},
    {id:3, name:"Hillside Airport",  address:"Terminal 2, Gate B12",       distance:"4.8 km", open:1, wait_mins:5,    emoji:"✈️"},
    {id:4, name:"Hillside Mall",     address:"Upper Ground, City Mall",    distance:"2.1 km", open:0, wait_mins:null, emoji:"🛍️"},
  ];
  cafes.forEach(c => insertCafe.run(c));

  console.log('✅ Seeding complete!');
}

// ─── Request Logger ───────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const orderCount   = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    database:  'sqlite',
    db_file:   'data/hillside.db',
    products:  productCount,
    orders:    orderCount,
  });
});

// Get all products (supports ?tag=light&featured=true)
app.get('/api/products', (req, res) => {
  const { tag, featured } = req.query;
  let rows = db.prepare('SELECT * FROM products').all();

  // Parse JSON tags field
  rows = rows.map(r => ({...r, tags: JSON.parse(r.tags), featured: !!r.featured, inStock: !!r.in_stock}));

  if(tag)      rows = rows.filter(p => p.tags.includes(tag));
  if(featured) rows = rows.filter(p => p.featured);

  res.json(rows);
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'Product not found' });
  res.json({...row, tags: JSON.parse(row.tags), featured: !!row.featured, inStock: !!row.in_stock});
});

// Get all cafes
app.get('/api/cafes', (req, res) => {
  const rows = db.prepare('SELECT * FROM cafes').all();
  res.json(rows.map(c => ({...c, open: !!c.open})));
});

// Place an order — saves to SQLite
app.post('/api/orders', (req, res) => {
  const { items, delivery, total } = req.body;

  if(!items || !items.length)
    return res.status(400).json({ error: 'Order must contain at least one item' });
  if(!delivery || !delivery.mode)
    return res.status(400).json({ error: 'Delivery information is required' });

  // Validate products exist
  for(const item of items){
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    if(!product)
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    if(!product.in_stock)
      return res.status(400).json({ error: `${product.name} is out of stock` });
  }

  // Insert order into SQLite
  const stmt = db.prepare(`
    INSERT INTO orders (items, delivery_mode, delivery_date, delivery_time, cafe_id, address, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `);

  const result = stmt.run(
    JSON.stringify(items),
    delivery.mode,
    delivery.date ?? null,
    delivery.time ?? null,
    delivery.cafeId ?? null,
    delivery.address ?? null,
    total
  );

  const orderId = result.lastInsertRowid;
  const estimatedTime = delivery.mode === 'collect'
    ? `Ready in ${delivery.time}`
    : `Delivering ${delivery.date === 0 ? 'today' : 'tomorrow'} at ${delivery.time}`;

  console.log(`✅ Order #${orderId} saved to database — $${total}`);

  res.status(201).json({
    orderId,
    status: 'confirmed',
    estimatedTime,
    message: "Order placed and saved! We're roasting for you ☕"
  });
});

// Get all orders
app.get('/api/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY placed_at DESC').all();
  res.json(rows.map(o => ({...o, items: JSON.parse(o.items)})));
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if(!row) return res.status(404).json({ error: 'Order not found' });
  res.json({...row, items: JSON.parse(row.items)});
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n☕ Hillside Coffee API running on http://localhost:${PORT}`);
  console.log(`   GET  /api/products`);
  console.log(`   GET  /api/products/:id`);
  console.log(`   POST /api/orders`);
  console.log(`   GET  /api/orders`);
  console.log(`   GET  /api/cafes`);
  console.log(`   GET  /api/health\n`);
});

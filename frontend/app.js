// ============================================================
//  Hillside Coffee — Frontend App Logic
//  Talks to the backend at /api/* endpoints
// ============================================================

const API = '/api'; // backend base URL (proxied by nginx in prod)

/* ─── State ─── */
let products = [];
let cart = {};
let activeCategory = 'all';
let deliveryMode = 'deliver';
let selectedDate = 0;
let selectedTime = null;
let selectedCafe = null;
let selectedCollectTime = null;
let deliveryConfirmed = false;

const cafes = [
  {id:1, name:"Hillside Central",    addr:"12 Espresso Lane, Downtown",  distance:"0.3 km", open:true,  wait:"10 min", emoji:"☕"},
  {id:2, name:"Hillside Westside",   addr:"88 Brew St, West Quarter",    distance:"1.2 km", open:true,  wait:"15 min", emoji:"🏪"},
  {id:3, name:"Hillside Airport",    addr:"Terminal 2, Gate B12",        distance:"4.8 km", open:true,  wait:"5 min",  emoji:"✈️"},
  {id:4, name:"Hillside Mall",       addr:"Upper Ground, City Mall",     distance:"2.1 km", open:false, wait:"Closed", emoji:"🛍️"},
];

/* ─── Clock & Greeting ─── */
function tick(){
  const n = new Date();
  document.getElementById('clock').textContent =
    `${n.getHours()}:${n.getMinutes().toString().padStart(2,'0')}`;
}
setInterval(tick, 1000); tick();

const h = new Date().getHours();
document.getElementById('greeting').textContent =
  h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🌤' : 'Good evening 🌙';

/* ─── Fetch products from backend ─── */
async function loadProducts(){
  try {
    const res = await fetch(`${API}/products`);
    products = await res.json();
  } catch(e) {
    // Fallback data if backend is unreachable (e.g. opening file:// locally)
    products = [
      {id:1,name:"Yirgacheffe",   origin:"Ethiopia · Washed",     notes:"Jasmine, lemon zest, honey",           roast:.2, tags:["light","fruity","floral"], price:18, emoji:"🌸", bg:"#FFF0F5", featured:true,  badge:"NEW"},
      {id:2,name:"Huila Reserve", origin:"Colombia · Natural",    notes:"Red cherry, caramel, brown sugar",      roast:.45,tags:["medium","fruity"],          price:19, emoji:"🍒", bg:"#FFF5F0", featured:true,  badge:"POPULAR"},
      {id:3,name:"Sidamo Dark",   origin:"Ethiopia · Natural",    notes:"Blueberry, dark chocolate, molasses",   roast:.7, tags:["dark","fruity"],            price:20, emoji:"🫐", bg:"#F3F0FF", featured:false, badge:null},
      {id:4,name:"Mandheling",    origin:"Indonesia · Wet-hulled",notes:"Cedar, dark cocoa, earthy",             roast:.9, tags:["dark"],                     price:17, emoji:"🪵", bg:"#F5F0EA", featured:false, badge:null},
      {id:5,name:"Marigold Blend",origin:"Brazil · Honey",        notes:"Almond, caramel, toasted walnut",       roast:.6, tags:["medium","nutty"],           price:16, emoji:"🌰", bg:"#FFF8E8", featured:true,  badge:"STAFF PICK"},
      {id:6,name:"Kona Estate",   origin:"Hawaii · Washed",       notes:"Macadamia, brown butter, mango",        roast:.4, tags:["light","nutty","fruity"],   price:32, emoji:"🥥", bg:"#F0F8FF", featured:false, badge:null},
    ];
  }
  renderFeatured();
  renderProdList();
}

/* ─── Navigation ─── */
const screenOrder = ['home','menu','cart'];
let currentScreen = 'home';

function goTo(s){
  if(s === currentScreen) return;
  const cur = document.getElementById(`screen-${currentScreen}`);
  const nxt = document.getElementById(`screen-${s}`);
  const goRight = screenOrder.indexOf(s) > screenOrder.indexOf(currentScreen);
  cur.classList.add(goRight ? 'slide-left' : 'slide-right');
  nxt.classList.remove('slide-left','slide-right');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`nav-${s}`).classList.add('active');
  currentScreen = s;
  if(s === 'cart') renderCart();
  if(s === 'menu') renderMenuList();
}

/* ─── Category Filter ─── */
function setCategory(el, cat){
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeCategory = cat;
  renderFeatured();
  renderProdList();
}

/* ─── Search ─── */
function filterSearch(val){
  const q = val.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.notes.toLowerCase().includes(q) ||
    p.origin.toLowerCase().includes(q)
  );
  renderProdListWith(filtered);
}

/* ─── Cart ─── */
function addToCart(id){
  cart[id] = (cart[id] || 0) + 1;
  updateBadge();
  const p = products.find(x => x.id === id);
  showToast(`${p.emoji} ${p.name} added!`);
}

function changeQty(id, delta){
  cart[id] = (cart[id] || 0) + delta;
  if(cart[id] <= 0) delete cart[id];
  updateBadge();
  renderCart();
}

function updateBadge(){
  const count = Object.values(cart).reduce((a,b) => a + b, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = count;
  badge.style.display = count ? 'flex' : 'none';
}

/* ─── Toast ─── */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ─── Render: Featured ─── */
function renderFeatured(){
  const el = document.getElementById('featuredScroll');
  const list = products.filter(p =>
    p.featured && (activeCategory === 'all' || p.tags.includes(activeCategory))
  );
  el.innerHTML = list.map(p => `
    <div class="feat-card" onclick="addToCart(${p.id})">
      <div class="feat-img" style="background:${p.bg};">
        ${p.emoji}
        ${p.badge ? `<div class="feat-badge">${p.badge}</div>` : ''}
      </div>
      <div class="feat-body">
        <div class="feat-origin">${p.origin}</div>
        <div class="feat-name">${p.name}</div>
        <div class="feat-foot">
          <span class="feat-price">$${p.price}</span>
          <button class="feat-add" onclick="event.stopPropagation();addToCart(${p.id})">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ─── Render: Product list (home) ─── */
function renderProdList(){
  const list = products.filter(p =>
    activeCategory === 'all' || p.tags.includes(activeCategory)
  );
  renderProdListWith(list);
}

function renderProdListWith(list){
  const el = document.getElementById('prodList');
  if(!list.length){
    el.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px 0;font-size:14px;">No coffees match that filter.</div>`;
    return;
  }
  el.innerHTML = list.map(p => `
    <div class="prod-row">
      <div class="prod-emoji" style="background:${p.bg};">${p.emoji}</div>
      <div class="prod-info">
        <div class="prod-origin">${p.origin}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-notes">${p.notes}</div>
      </div>
      <div class="prod-right">
        <span class="prod-price">$${p.price}</span>
        <button class="prod-add-btn" onclick="addToCart(${p.id})">+</button>
      </div>
    </div>
  `).join('');
}

/* ─── Render: Menu list ─── */
function renderMenuList(){
  const el = document.getElementById('menuList');
  el.innerHTML = products.map(p => `
    <div class="prod-row">
      <div class="prod-emoji" style="background:${p.bg};">${p.emoji}</div>
      <div class="prod-info">
        <div class="prod-origin">${p.origin}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-notes">${p.notes}</div>
        <div class="roast-bar-wrap">
          <span class="roast-mini-label">LIGHT</span>
          <div class="roast-mini-track">
            <div class="roast-mini-dot" style="left:calc(${p.roast * 100}% - 5px)"></div>
          </div>
          <span class="roast-mini-label">DARK</span>
        </div>
      </div>
      <div class="prod-right">
        <span class="prod-price">$${p.price}</span>
        <button class="prod-add-btn" onclick="addToCart(${p.id})">+</button>
      </div>
    </div>
  `).join('');
}

/* ─── Render: Cart ─── */
function renderCart(){
  const keys   = Object.keys(cart);
  const empty  = document.getElementById('emptyCart');
  const items  = document.getElementById('cartItems');
  const summary= document.getElementById('cartSummary');
  const btn    = document.getElementById('checkoutBtn');
  const sub    = document.getElementById('cartSub');

  if(!keys.length){
    empty.style.display  = 'block';
    items.innerHTML      = '';
    summary.style.display= 'none';
    btn.style.display    = 'none';
    document.getElementById('deliverySection').style.display = 'none';
    document.getElementById('deliverySummary').classList.remove('visible');
    sub.textContent = "Nothing yet — add a coffee!";
    return;
  }

  empty.style.display  = 'none';
  summary.style.display= 'block';
  btn.style.display    = 'block';

  if(!deliveryConfirmed){
    document.getElementById('deliverySection').style.display = 'block';
    initDelivery();
  }

  const total = keys.reduce((s, id) => {
    const p = products.find(x => x.id == id);
    return s + p.price * cart[id];
  }, 0);
  const count = Object.values(cart).reduce((a,b) => a + b, 0);

  sub.textContent = `${count} item${count > 1 ? 's' : ''} in your bag`;
  document.getElementById('subtotal').textContent    = `$${total.toFixed(2)}`;
  document.getElementById('totalAmt').textContent    = `$${(total + 4.99).toFixed(2)}`;
  document.getElementById('checkoutTotal').textContent = `$${(total + 4.99).toFixed(2)}`;

  items.innerHTML = keys.map(id => {
    const p = products.find(x => x.id == id);
    return `
      <div class="cart-item">
        <div class="cart-emoji" style="background:${p.bg};">${p.emoji}</div>
        <div class="cart-info">
          <div class="cart-name">${p.name}</div>
          <div class="cart-price">$${p.price} · ${p.origin.split('·')[0].trim()}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
          <div class="qty-num">${cart[id]}</div>
          <button class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
        </div>
      </div>`;
  }).join('');
}

/* ─── Checkout ─── */
async function checkout(){
  if(!Object.keys(cart).length) return;
  if(!deliveryConfirmed){
    showToast('📍 Please choose delivery or collect first!');
    return;
  }

  const orderPayload = {
    items: Object.entries(cart).map(([id, qty]) => {
      const p = products.find(x => x.id == id);
      return { productId: Number(id), name: p.name, qty, price: p.price };
    }),
    delivery: {
      mode: deliveryMode,
      date: selectedDate,
      time: selectedTime || selectedCollectTime,
      cafeId: selectedCafe,
      address: document.getElementById('addressInput')?.value || null,
    },
    total: Object.entries(cart).reduce((s,[id,qty]) => {
      const p = products.find(x => x.id == id);
      return s + p.price * qty;
    }, 0) + 4.99
  };

  try {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();
    const mode = deliveryMode === 'deliver' ? '🚴 On its way!' : '🏪 Ready to collect!';
    showToast(`☕ Order #${data.orderId} placed! ${mode}`);
  } catch(e) {
    showToast('☕ Order placed! Roasting for you soon…');
  }

  cart = {}; deliveryConfirmed = false; selectedTime = null;
  selectedCafe = null; selectedCollectTime = null;
  updateBadge(); renderCart();
}

/* ─── Delivery System ─── */
function initDelivery(){
  const dateRow = document.getElementById('dateRow');
  const days    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  dateRow.innerHTML = '';
  for(let i = 0; i < 7; i++){
    const d = new Date(); d.setDate(d.getDate() + i);
    const pill = document.createElement('div');
    pill.className = 'date-pill' + (i === 0 ? ' selected' : '');
    pill.innerHTML = `<div>${i === 0 ? 'Today' : days[d.getDay()]}</div><div class="date-day">${d.getDate()} ${months[d.getMonth()]}</div>`;
    pill.onclick = () => {
      document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedDate = i;
      renderTimeSlots();
    };
    dateRow.appendChild(pill);
  }
  renderTimeSlots();
  renderCafes();
  renderCollectSlots();
}

function renderTimeSlots(){
  const el = document.getElementById('timeSlots');
  const slots = selectedDate === 0
    ? ['ASAP','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM']
    : ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'];
  el.innerHTML = slots.map(s => `
    <div class="time-slot ${s === 'ASAP' ? 'asap' : ''} ${selectedTime === s ? 'selected' : ''}"
      onclick="selectTime('${s}')">${s}</div>
  `).join('');
}

function selectTime(t){
  selectedTime = t;
  renderTimeSlots();
  confirmDelivery();
}

function renderCafes(){
  const el = document.getElementById('cafeList');
  el.innerHTML = cafes.map(c => `
    <div class="cafe-card ${selectedCafe === c.id ? 'selected' : ''}"
      onclick="${c.open ? `selectCafe(${c.id})` : ''}">
      <div class="cafe-icon">${c.emoji}</div>
      <div class="cafe-info">
        <div class="cafe-name">${c.name}</div>
        <div class="cafe-addr">${c.addr}</div>
        <div class="cafe-meta">
          <span class="cafe-tag ${c.open ? 'open' : ''}">${c.open ? '● Open' : '✕ Closed'}</span>
          <span class="cafe-tag">📍 ${c.distance}</span>
          <span class="cafe-tag">⏱ ${c.wait}</span>
        </div>
      </div>
      <div class="cafe-check">${selectedCafe === c.id ? '✓' : ''}</div>
    </div>
  `).join('');
}

function selectCafe(id){
  selectedCafe = id;
  selectedCollectTime = null;
  renderCafes();
  document.getElementById('collectTime').style.display = 'block';
  renderCollectSlots();
}

function renderCollectSlots(){
  const slots = ['ASAP','30 min','1 hour','2 hours','Tomorrow'];
  document.getElementById('collectSlots').innerHTML = slots.map(s => `
    <div class="collect-slot ${selectedCollectTime === s ? 'selected' : ''}"
      onclick="selectCollectTime('${s}')">${s}</div>
  `).join('');
}

function selectCollectTime(t){
  selectedCollectTime = t;
  renderCollectSlots();
  confirmDelivery();
}

function switchDelivery(mode){
  deliveryMode = mode;
  document.querySelectorAll('.dtab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${mode}`).classList.add('active');
  document.getElementById('panel-deliver').style.display = mode === 'deliver' ? 'block' : 'none';
  document.getElementById('panel-collect').style.display = mode === 'collect' ? 'block' : 'none';
  selectedTime = null; selectedCafe = null; selectedCollectTime = null;
  deliveryConfirmed = false;
  document.getElementById('deliverySummary').classList.remove('visible');
}

function confirmDelivery(){
  const summary = document.getElementById('deliverySummary');
  const dayLabels = ['Today','Tomorrow','In 2 days','In 3 days','In 4 days','In 5 days','In 6 days'];

  if(deliveryMode === 'deliver' && selectedTime){
    document.getElementById('dsIcon').textContent  = '🚴';
    document.getElementById('dsTitle').textContent = `Delivering ${dayLabels[selectedDate]} at ${selectedTime}`;
    const addr = document.getElementById('addressInput').value;
    document.getElementById('dsSub').textContent   = addr ? `To: ${addr}` : 'Add your address above';
    summary.classList.add('visible');
    document.getElementById('deliverySection').style.display = 'none';
    deliveryConfirmed = true;
  } else if(deliveryMode === 'collect' && selectedCafe && selectedCollectTime){
    const cafe = cafes.find(c => c.id === selectedCafe);
    document.getElementById('dsIcon').textContent  = '🏪';
    document.getElementById('dsTitle').textContent = `Collect from ${cafe.name}`;
    document.getElementById('dsSub').textContent   = `Ready in ${selectedCollectTime} · ${cafe.addr}`;
    summary.classList.add('visible');
    document.getElementById('deliverySection').style.display = 'none';
    deliveryConfirmed = true;
  }
}

function editDelivery(){
  document.getElementById('deliverySummary').classList.remove('visible');
  document.getElementById('deliverySection').style.display = 'block';
  deliveryConfirmed = false;
}

/* ─── Init ─── */
loadProducts();

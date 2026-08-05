/* ═══════════════════════════════════════════════════════════
   TABERNA — nscript.js
   Produtos carregados ao vivo do banco (PHP/MySQL Hostinger)
   ═══════════════════════════════════════════════════════════ */

const API_BASE = '/api';   // ajuste se necessário

/* ═══════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ═══════════════════════════════════════════════════════════ */

// Produtos vindos do servidor (preenchido em loadCatalog)
let DRINKS = [];
let DEALS  = [];   // produtos com promocao=1

// Marcas dinâmicas (extraídas dos produtos depois de carregar)
let BRANDS = [{ id:'todos', label:'Todos', logo:'https://via.placeholder.com/60/222/ff2d95?text=★' }];

let activeBrand   = 'todos';
let activeScreen  = 'home';
let _searchQuery  = '';

// Carrinho em memória  { key: { drink, qty } }  key = "TABELA:id"
const cart = {};

// Favoritos locais  Set<"TABELA:id">
const favorites = new Set();

let currentUser = null;

/* ─── Auth ────────────────────────────────────────────────── */
const Auth = {
  save(token, user) {
    localStorage.setItem('taberna_token', token);
    localStorage.setItem('taberna_user',  JSON.stringify(user));
    currentUser = user;
  },
  load() {
    const raw = localStorage.getItem('taberna_user');
    if (raw) try { currentUser = JSON.parse(raw); } catch {}
    return localStorage.getItem('taberna_token') ?? '';
  },
  token()    { return localStorage.getItem('taberna_token') ?? ''; },
  clear()    { localStorage.removeItem('taberna_token'); localStorage.removeItem('taberna_user'); currentUser = null; },
  isLoggedIn(){ return !!localStorage.getItem('taberna_token'); },
};

/* ═══════════════════════════════════════════════════════════
   CAMADA DE API
   ═══════════════════════════════════════════════════════════ */
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (Auth.token()) opts.headers['Authorization'] = `Bearer ${Auth.token()}`;
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${API_BASE}${path}`, opts);
    const json = await res.json();
    return { ok: res.ok && json.ok, data: json.data, error: json.error };
  } catch (e) {
    return { ok: false, data: null, error: 'Erro de conexão.' };
  }
}

/* ═══════════════════════════════════════════════════════════
   CATÁLOGO — carrega do banco
   ═══════════════════════════════════════════════════════════ */

function normalizeProduct(row) {
  const onSale = Number(row.promocao) === 1 && Number(row.valor_promocional) > 0;
  // brand = nome da marca em lowercase sem espaços, usado como id do filtro
  const brandId = row.marca
    ? row.marca.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
    : 'outros';
  return {
    id:         Number(row.id),
    table:      row.table_name,
    category:   row.table_name,   // LANCHES | COMBOS | ACOMPANHAMENTOS | BEBIDAS | INGREDIENTES
    key:        String(row.id),   // ID global unico (1-99, 100-199, 200-299)
    brand:      brandId,
    brandLabel: row.marca || 'Outros',
    name:       row.nome + ' ' + row.ml + (row.table_name === 'BEBIDAS' ? 'ml' : 'g'),
    price:      Number(row.preco),
    salePrice:  onSale ? Number(row.valor_promocional) : null,
    onSale:     onSale,
    dealExpiresAt: row.promocao_expira_em || null,
    stars:      Math.round(Number(row.rate || 4)),
    badge:      Number(row.retornavel) ? 'Vegetariano' : null,
    img:        '/src/img/' + row.img,
  };
}

async function loadCatalog() {
  showGridSkeleton();
  const [catRes, dealRes] = await Promise.all([
    api('GET', '/catalog'),
    api('GET', '/catalog/deals'),
  ]);

  if (!catRes.ok) {
    showGridError();
    return;
  }

  // IDs globalmente unicos: LANCHES 1-99, COMBOS 100-199, ACOMPANHAMENTOS 200-299,
  // BEBIDAS 300-399, INGREDIENTES 400-499
  // Sem necessidade de deduplicacao — cada linha tem ID unico
  DRINKS = catRes.data.map(normalizeProduct);
  DEALS  = dealRes.ok ? dealRes.data.map(normalizeProduct) : [];

  // Reconstroi BRANDS pelas marcas presentes
  const seen = new Set();
  BRANDS = [{
    id:    'todos',
    label: 'Todos',
    logo:  'https://via.placeholder.com/60/222/ff2d95?text=★',
  }];
  DRINKS.forEach(function(d) {
    if (!seen.has(d.brand)) {
      seen.add(d.brand);
      var initials = d.brandLabel.slice(0, 4);
      BRANDS.push({
        id:    d.brand,
        label: d.brandLabel,
        logo:  'https://via.placeholder.com/60/1a1a1a/fff?text=' + encodeURIComponent(initials),
      });
    }
  });

  renderBrands();
  renderGrid();
}

function showGridSkeleton() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="grid-card skeleton">
      <div class="skeleton__img"></div>
      <div class="grid-card__body">
        <div class="skeleton__line skeleton__line--name"></div>
        <div class="skeleton__line skeleton__line--price"></div>
      </div>
    </div>
  `).join('');
}

function showGridError() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="empty-state" style="grid-column:1/-1">
      <span class="empty-state__icon">⚠️</span>
      <p class="empty-state__text">Não foi possível carregar os produtos.</p>
      <p class="empty-state__sub">Verifique a conexão com a API.</p>
      <button class="btn-primary" style="margin-top:1rem;width:auto;padding:8px 24px"
              onclick="loadCatalog()">Tentar novamente</button>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('toast--show'));
  setTimeout(() => { t.classList.remove('toast--show'); setTimeout(() => t.remove(), 300); }, 2800);
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const toStars = n => '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0,5-n));
const toBRL   = v => Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

/* ═══════════════════════════════════════════════════════════
   NAVEGAÇÃO
   ═══════════════════════════════════════════════════════════ */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.screen[data-screen="${name}"]`);
  if (target) { target.classList.add('active'); activeScreen = name; }
  if (name === 'favoritos') renderFavorites();
  if (name === 'carrinho')  {
    if (Auth.isLoggedIn()) {
      api('GET', '/addresses').then(function(res) {
        window._savedAddresses = res.ok ? res.data : [];
        if (window._savedAddresses.length > 0 && !checkoutState.savedAddressId) {
          var def = window._savedAddresses.find(function(a){ return a.is_default; });
          checkoutState.savedAddressId = def ? def.id : window._savedAddresses[0].id;
          checkoutState.addressMode = 'saved';
        }
        renderCart();
      });
    } else {
      renderCart();
    }
  }
  if (name === 'descontos') { renderDeals(); initDealTimer(); }
  if (name === 'perfil')    renderProfile();
  window.scrollTo({ top:0, behavior:'smooth' });
}

/* ═══════════════════════════════════════════════════════════
   BOTTOM BAR
   ═══════════════════════════════════════════════════════════ */
function initBottomBar() {
  document.querySelectorAll('.botonBar .list').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.botonBar .list').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      showScreen(this.dataset.target);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   CARROSSEL (Swiper) — usa os primeiros 6 produtos carregados
   ═══════════════════════════════════════════════════════════ */
function initSwiper() {
  const swiper = new Swiper('.swiper-container', {
    loop:true, slidesPerView:2, spaceBetween:24, speed:400,
    navigation:{ nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev' },
    pagination:{ el:'.swiper-pagination', clickable:true, dynamicBullets:true },
    keyboard:{ enabled:true, onlyInViewport:true },
    a11y:{ prevSlideMessage:'Produto anterior', nextSlideMessage:'Próximo produto' },
    breakpoints:{ 768:{ slidesPerView:3 }, 1024:{ slidesPerView:4 } },
    on:{ init() { this.slides.forEach(s => s.setAttribute('tabindex','0')); } },
  });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => swiper.update(), 250); });

  // Botões "Comprar" do carrossel estático do HTML
  document.querySelectorAll('.product-card__button').forEach(btn => {
    btn.addEventListener('click', function() {
      // O carrossel do HTML é decorativo/estático; abre a home para comprar
      document.querySelector('.botonBar .list[data-target="home"]')?.click();
      showToast('Navegue pelo catálogo para adicionar ao carrinho 👇', 'info');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   FILTRO DE MARCAS
   ═══════════════════════════════════════════════════════════ */
function renderBrands() {
  const track = document.getElementById('brand-track');
  if (!track) return;
  track.innerHTML = BRANDS.map(b => `
    <button class="brand-chip ${b.id===activeBrand?'active':''}"
            data-brand="${b.id}" aria-pressed="${b.id===activeBrand}"
            aria-label="Filtrar por ${b.label}">
      <span class="brand-chip__logo">
        <img src="${b.logo}" alt="${b.label}" width="60" height="60" loading="lazy"/>
      </span>
      <span class="brand-chip__label">${b.label}</span>
    </button>
  `).join('');
  track.querySelectorAll('.brand-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      activeBrand = this.dataset.brand;
      renderBrands();
      applyFilters();
      document.querySelector('.products-grid')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   GRID DE PRODUTOS
   ═══════════════════════════════════════════════════════════ */
function gridCardHTML(d, i, opts = {}) {
  const { removeFav=false, forceDiscount=null } = opts;
  const isFav      = favorites.has(d.key);
  const discount   = forceDiscount ?? (d.onSale && d.salePrice
    ? Math.round((1 - d.salePrice / d.price) * 100) : 0);
  const finalPrice = discount ? d.price * (1 - discount / 100) : (d.salePrice ?? d.price);

  return `
    <article class="grid-card" data-brand="${d.brand}" data-key="${d.key}"
             style="animation-delay:${i*0.04}s">
      <div class="grid-card__image-wrap">
        ${d.badge && !discount ? `<span class="grid-card__badge">${d.badge}</span>` : ''}
        ${discount            ? `<span class="grid-card__discount-badge">-${discount}%</span>` : ''}
        <button class="grid-card__fav-btn ${isFav?'active':''}" data-key="${d.key}"
                aria-label="${isFav?'Remover dos':'Adicionar aos'} favoritos"
                aria-pressed="${isFav}">
          ${isFav ? '★' : '☆'}
        </button>
        ${removeFav ? `<button class="grid-card__fav-remove" data-key="${d.key}" aria-label="Remover dos favoritos">★</button>` : ''}
        <img src="${d.img}" alt="${d.name}" loading="lazy" width="200" height="280"
             onerror="this.src='https://via.placeholder.com/200x280/111/fff?text=${encodeURIComponent(d.name.slice(0,10))}'"/>
      </div>
      <div class="grid-card__body">
        <p class="grid-card__brand-tag">${d.brandLabel}</p>
        <h3 class="grid-card__name">${d.name}</h3>
        <div class="grid-card__rating" aria-label="Avaliação: ${d.stars} estrelas">${toStars(d.stars)}</div>
        <div class="grid-card__footer">
          <div>
            ${discount||d.onSale ? `<p class="grid-card__original-price">${toBRL(d.price)}</p>` : ''}
            <span class="grid-card__price">${toBRL(finalPrice)}</span>
          </div>
          <button class="grid-card__btn" data-key="${d.key}"
                  aria-label="Adicionar ${d.name} ao carrinho">Comprar</button>
        </div>
      </div>
    </article>
  `;
}

function renderGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = DRINKS.map((d,i) => gridCardHTML(d,i)).join('');
  bindGridEvents(grid);
  updateCount();
}

function bindGridEvents(container) {
  // Botão comprar
  container.querySelectorAll('.grid-card__btn').forEach(btn => {
    btn.addEventListener('click', function() { addToCart(this.dataset.key); });
  });
  // Botão favoritar (estrela no card)
  container.querySelectorAll('.grid-card__fav-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      await toggleFavorite(this.dataset.key);
      // atualiza só o botão sem re-renderizar tudo
      const isFav = favorites.has(this.dataset.key);
      this.textContent = isFav ? '★' : '☆';
      this.classList.toggle('active', isFav);
      this.setAttribute('aria-pressed', String(isFav));
      this.setAttribute('aria-label', (isFav?'Remover dos':'Adicionar aos')+' favoritos');
    });
  });
  // Botão remover favorito (tela favoritos)
  container.querySelectorAll('.grid-card__fav-remove').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      await toggleFavorite(this.dataset.key);
      renderFavorites();
    });
  });
}

/* ── Filtro unificado ─────────────────────────────────────── */
function applyFilters() {
  const q     = _searchQuery.toLowerCase();
  const cards = document.querySelectorAll('#products-grid .grid-card');
  let visible = 0;
  cards.forEach(card => {
    const brandMatch  = activeBrand === 'todos' || card.dataset.brand === activeBrand;
    const name        = card.querySelector('.grid-card__name')?.textContent.toLowerCase() ?? '';
    const brandLabel  = card.querySelector('.grid-card__brand-tag')?.textContent.toLowerCase() ?? '';
    const searchMatch = q.length === 0 || name.includes(q) || brandLabel.includes(q);
    const show = brandMatch && searchMatch;
    if (show) {
      card.classList.remove('hidden','entering');
      void card.offsetWidth;
      card.style.animationDelay = `${visible*0.04}s`;
      card.classList.add('entering');
      visible++;
    } else {
      card.classList.add('hidden');
      card.classList.remove('entering');
    }
  });
  updateCount(visible);
}

function updateCount(n) {
  let el = document.querySelector('.products-grid__count');
  if (!el) {
    el = document.createElement('p');
    el.className = 'products-grid__count';
    document.querySelector('.products-grid__title')?.insertAdjacentElement('afterend', el);
  }
  const total = n ?? DRINKS.length;
  const brand = BRANDS.find(b => b.id === activeBrand);
  el.textContent = activeBrand === 'todos'
    ? `${total} produto${total!==1?'s':''}`
    : `${total} produto${total!==1?'s':''} em ${brand?.label}`;
}

/* ═══════════════════════════════════════════════════════════
   CARRINHO — completo
   ═══════════════════════════════════════════════════════════ */

// Número WhatsApp do dono da taberna (DDI+DDD+número, só dígitos)
const WHATSAPP_OWNER = "5500000000000";

// Métodos de pagamento disponíveis
const PAYMENT_METHODS = [
  { id:'pix',             label:'PIX',             icon:'💠' },
  { id:'dinheiro',        label:'Dinheiro',         icon:'💵' },
  { id:'cartao_credito',  label:'Cartão de Crédito',icon:'💳' },
  { id:'cartao_debito',   label:'Cartão de Débito', icon:'🏧' },
];

// Estado do checkout
let checkoutState = {
  couponCode:    '',
  couponDiscount:0,
  paymentMethod: 'pix',
  addressMode:   'new',   // 'new' | 'saved' | 'guest'
  savedAddressId: null,
  newAddress:    { street:'', number:'', complement:'' },
  guestName:     '',
  guestPhone:    '',
};

function getDrinkByKey(key) {
  return DRINKS.find(d => d.key === key) || DEALS.find(d => d.key === key) || null;
}

function addToCart(key) {
  const drink = getDrinkByKey(key);
  if (!drink) return;
  if (cart[key]) cart[key].qty++;
  else cart[key] = { drink, qty:1 };
  updateCartBadge();
  showToast(drink.name + ' adicionado ao carrinho! 🛒', 'success');
  document.querySelectorAll('.grid-card__btn[data-key="' + key + '"]').forEach(function(btn) {
    const orig = btn.textContent;
    btn.textContent = '✓';
    btn.style.background = 'var(--color-accent)';
    btn.style.color = 'var(--color-bg-primary)';
    setTimeout(function() { btn.textContent = orig; btn.style.background=''; btn.style.color=''; }, 800);
  });
}

function updateCartBadge() {
  const total = Object.values(cart).reduce(function(s,i){ return s+i.qty; }, 0);
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

/* ── Cálculos ─────────────────────────────────────────────── */
function cartTotals() {
  const items    = Object.values(cart);
  const subtotal = items.reduce(function(s, obj) {
    return s + (obj.drink.salePrice || obj.drink.price) * obj.qty;
  }, 0);
  const discount = checkoutState.couponDiscount;
  const total    = Math.max(0, subtotal - discount);
  return { items, subtotal, discount, total };
}

/* ── Renderização principal ───────────────────────────────── */
function renderCart() {
  const screen = document.querySelector('[data-screen="carrinho"]');
  if (!screen) return;

  const { items, subtotal, discount, total } = cartTotals();

  if (items.length === 0) {
    screen.innerHTML = `
      <div class="page-wrapper">
        <h2 class="page-title">Carrinho</h2>
        <div class="empty-state">
          <span class="empty-state__icon">🛒</span>
          <p class="empty-state__text">Seu carrinho está vazio.</p>
          <p class="empty-state__sub">Adicione produtos para continuar.</p>
        </div>
      </div>`;
    return;
  }

  screen.innerHTML = `
    <div class="page-wrapper">
      <h2 class="page-title">Carrinho</h2>

      <!-- Itens -->
      <div id="cart-list">${items.map(renderCartItem).join('')}</div>

      <!-- Cupom -->
      <div class="cart-coupon">
        <div class="cart-coupon__row">
          <input id="coupon-input" type="text" placeholder="Código do cupom"
                 value="${checkoutState.couponCode}"
                 style="text-transform:uppercase"/>
          <button class="btn-coupon" id="btn-apply-coupon">Aplicar</button>
        </div>
        <p class="cart-coupon__msg" id="coupon-msg"></p>
      </div>

      <!-- Pagamento -->
      <div class="cart-section">
        <h3 class="cart-section__title">Forma de Pagamento</h3>
        <div class="payment-grid">
          ${PAYMENT_METHODS.map(function(m) {
            return `<button class="payment-btn ${checkoutState.paymentMethod===m.id?'active':''}"
                            data-method="${m.id}">
                      <span class="payment-btn__icon">${m.icon}</span>
                      <span class="payment-btn__label">${m.label}</span>
                    </button>`;
          }).join('')}
        </div>
      </div>

      <!-- Endereço -->
      <div class="cart-section" id="section-address">
        <h3 class="cart-section__title">Endereço de Entrega</h3>
        ${renderAddressSection()}
      </div>

      <!-- Resumo -->
      <div class="cart-summary">
        <div class="cart-summary__row">
          <span>Subtotal</span>
          <span>${toBRL(subtotal)}</span>
        </div>
        ${discount > 0 ? `
        <div class="cart-summary__row cart-summary__row--discount">
          <span>Desconto (${checkoutState.couponCode})</span>
          <span>− ${toBRL(discount)}</span>
        </div>` : ''}
        <div class="cart-summary__row cart-summary__row--total">
          <span>Total</span>
          <span id="cart-total">${toBRL(total)}</span>
        </div>
        <button class="btn-primary" id="btn-checkout">
          Finalizar Pedido
        </button>
      </div>
    </div>`;

  bindCartEvents();
}

function renderCartItem(obj) {
  const d   = obj.drink;
  const qty = obj.qty;
  const price = d.salePrice || d.price;
  return `
    <div class="cart-item" data-key="${d.key}">
      <img class="cart-item__img" src="${d.img}" alt="${d.name}" width="60" height="80"
           onerror="this.src='https://via.placeholder.com/60x80/111/fff?text=img'"/>
      <div class="cart-item__info">
        <p class="cart-item__name">${d.name}</p>
        <p class="cart-item__price">${toBRL(price * qty)}</p>
        <p class="cart-item__unit">Un.: ${toBRL(price)}</p>
      </div>
      <div class="cart-item__qty">
        <button data-action="dec" data-key="${d.key}" aria-label="Diminuir">−</button>
        <span>${qty}</span>
        <button data-action="inc" data-key="${d.key}" aria-label="Aumentar">+</button>
      </div>
      <button class="cart-item__remove" data-action="remove" data-key="${d.key}" aria-label="Remover">✕</button>
    </div>`;
}

function renderAddressSection() {
  if (!Auth.isLoggedIn()) {
    // Visitante: nome + telefone + endereço livre
    return `
      <div class="addr-guest">
        <div class="field-group">
          <label for="guest-name">Seu nome</label>
          <input id="guest-name" type="text" placeholder="João da Silva"
                 value="${checkoutState.guestName}"/>
        </div>
        <div class="field-group">
          <label for="guest-phone">WhatsApp / Telefone</label>
          <input id="guest-phone" type="tel" placeholder="(00) 00000-0000"
                 value="${checkoutState.guestPhone}"/>
        </div>
        <div class="field-group">
          <label for="guest-street">Rua / Av.</label>
          <input id="guest-street" type="text" placeholder="Rua das Flores"
                 value="${checkoutState.newAddress.street}"/>
        </div>
        <div class="addr-row">
          <div class="field-group">
            <label for="guest-number">Nº</label>
            <input id="guest-number" type="text" placeholder="123"
                   value="${checkoutState.newAddress.number}"/>
          </div>
          <div class="field-group">
            <label for="guest-complement">Complemento</label>
            <input id="guest-complement" type="text" placeholder="Apto 4B"
                   value="${checkoutState.newAddress.complement}"/>
          </div>
        </div>
      </div>`;
  }

  // Logado: escolhe entre endereços salvos ou digita um novo
  const savedAddresses = window._savedAddresses || [];
  return `
    <div class="addr-tabs">
      <button class="addr-tab ${checkoutState.addressMode==='saved'?'active':''}" data-addr-mode="saved">
        Endereços salvos
      </button>
      <button class="addr-tab ${checkoutState.addressMode==='new'?'active':''}" data-addr-mode="new">
        Novo endereço
      </button>
    </div>

    <div id="addr-saved-panel" style="display:${checkoutState.addressMode==='saved'?'block':'none'}">
      ${savedAddresses.length === 0
        ? '<p class="addr-empty">Nenhum endereço salvo. Use a aba "Novo endereço".</p>'
        : savedAddresses.map(function(a) {
            return `<label class="addr-radio ${checkoutState.savedAddressId===a.id?'active':''}">
              <input type="radio" name="saved-addr" value="${a.id}"
                     ${checkoutState.savedAddressId===a.id?'checked':''}/>
              <span>
                <strong>${a.street}, ${a.number}</strong>
                ${a.complement ? ' – '+a.complement : ''}
              </span>
            </label>`;
          }).join('')}
    </div>

    <div id="addr-new-panel" style="display:${checkoutState.addressMode==='new'?'block':'none'}">
      <div class="field-group">
        <label for="new-street">Rua / Av.</label>
        <input id="new-street" type="text" placeholder="Rua das Flores"
               value="${checkoutState.newAddress.street}"/>
      </div>
      <div class="addr-row">
        <div class="field-group">
          <label for="new-number">Nº</label>
          <input id="new-number" type="text" placeholder="123"
                 value="${checkoutState.newAddress.number}"/>
        </div>
        <div class="field-group">
          <label for="new-complement">Complemento</label>
          <input id="new-complement" type="text" placeholder="Apto 4B"
                 value="${checkoutState.newAddress.complement}"/>
        </div>
      </div>
    </div>`;
}

/* ── Eventos ──────────────────────────────────────────────── */
function bindCartEvents() {
  // Qtd e remover
  document.querySelectorAll('#cart-list button[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const key = this.dataset.key, action = this.dataset.action;
      if (action==='inc')    { if(cart[key]) cart[key].qty++; }
      if (action==='dec')    { if(cart[key]) cart[key].qty>1 ? cart[key].qty-- : delete cart[key]; }
      if (action==='remove') { delete cart[key]; }
      updateCartBadge();
      renderCart();
    });
  });

  // Cupom
  document.getElementById('coupon-input')?.addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });
  document.getElementById('btn-apply-coupon')?.addEventListener('click', applyCoupon);

  // Pagamento
  document.querySelectorAll('.payment-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      checkoutState.paymentMethod = this.dataset.method;
      document.querySelectorAll('.payment-btn').forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  // Abas de endereço (logado)
  document.querySelectorAll('.addr-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      checkoutState.addressMode = this.dataset.addrMode;
      document.querySelectorAll('.addr-tab').forEach(function(t){ t.classList.remove('active'); });
      this.classList.add('active');
      const saved = document.getElementById('addr-saved-panel');
      const newp  = document.getElementById('addr-new-panel');
      if (saved) saved.style.display = checkoutState.addressMode==='saved' ? 'block' : 'none';
      if (newp)  newp.style.display  = checkoutState.addressMode==='new'   ? 'block' : 'none';
    });
  });

  // Radio endereço salvo
  document.querySelectorAll('input[name="saved-addr"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      checkoutState.savedAddressId = parseInt(this.value);
      document.querySelectorAll('.addr-radio').forEach(function(l){ l.classList.remove('active'); });
      this.closest('.addr-radio').classList.add('active');
    });
  });

  // Finalizar
  document.getElementById('btn-checkout')?.addEventListener('click', checkout);
}

/* ── Cupom ────────────────────────────────────────────────── */
async function applyCoupon() {
  const input  = document.getElementById('coupon-input');
  const msgEl  = document.getElementById('coupon-msg');
  const code   = (input ? input.value.trim() : '');
  const { subtotal } = cartTotals();
  if (!code) { msgEl.textContent='Digite um código.'; msgEl.className='cart-coupon__msg error'; return; }

  const btn = document.getElementById('btn-apply-coupon');
  btn.textContent = '...'; btn.disabled = true;

  const res = await api('POST', '/coupons/validate', { code, subtotal });
  btn.textContent = 'Aplicar'; btn.disabled = false;

  if (res.ok) {
    checkoutState.couponCode     = res.data.code;
    checkoutState.couponDiscount = res.data.discount;
    msgEl.textContent = res.data.message;
    msgEl.className   = 'cart-coupon__msg success';
    renderCart();
  } else {
    checkoutState.couponCode     = '';
    checkoutState.couponDiscount = 0;
    msgEl.textContent = res.error || 'Cupom inválido.';
    msgEl.className   = 'cart-coupon__msg error';
  }
}

/* ── Checkout ─────────────────────────────────────────────── */
async function checkout() {
  const { items, subtotal, discount, total } = cartTotals();
  const btn = document.getElementById('btn-checkout');

  // Coleta endereço
  let addressId   = null;
  let addressText = '';
  let guestName   = '';
  let guestPhone  = '';

  if (!Auth.isLoggedIn()) {
    guestName  = (document.getElementById('guest-name')?.value || '').trim();
    guestPhone = (document.getElementById('guest-phone')?.value || '').trim();
    const street     = (document.getElementById('guest-street')?.value || '').trim();
    const number     = (document.getElementById('guest-number')?.value || '').trim();
    const complement = (document.getElementById('guest-complement')?.value || '').trim();
    if (!guestName)  { showToast('Informe seu nome.','error'); return; }
    if (!guestPhone) { showToast('Informe seu telefone.','error'); return; }
    if (!street)     { showToast('Informe a rua.','error'); return; }
    addressText = street + ', ' + number + (complement ? ' – '+complement : '');
  } else {
    if (checkoutState.addressMode === 'saved') {
      addressId   = checkoutState.savedAddressId;
      if (!addressId) { showToast('Selecione um endereço.','error'); return; }
      const found = (window._savedAddresses||[]).find(function(a){ return a.id===addressId; });
      if (found) addressText = found.street+', '+found.number+(found.complement?' – '+found.complement:'');
    } else {
      const street     = (document.getElementById('new-street')?.value || '').trim();
      const number     = (document.getElementById('new-number')?.value || '').trim();
      const complement = (document.getElementById('new-complement')?.value || '').trim();
      if (!street) { showToast('Informe a rua.','error'); return; }
      addressText = street + ', ' + number + (complement ? ' – '+complement : '');
    }
  }

  btn.textContent = 'Processando…'; btn.disabled = true;

  const payload = {
    items: items.map(function(obj) {
      return { id:obj.drink.id, table_name:obj.drink.table, name:obj.drink.name,
               price:obj.drink.salePrice||obj.drink.price, qty:obj.qty };
    }),
    subtotal:       subtotal,
    total:          total,
    discount:       discount,
    coupon_code:    checkoutState.couponCode,
    payment_method: checkoutState.paymentMethod,
    address_id:     addressId,
    address_text:   addressText,
    guest_name:     guestName,
    guest_phone:    guestPhone,
  };

  const res = await api('POST', '/orders', payload);

  btn.textContent = 'Finalizar Pedido'; btn.disabled = false;

  if (!res.ok) {
    showToast('Erro ao registrar pedido: ' + (res.error||''), 'error');
    return;
  }

  const orderId = res.data.order_id;
  const pts     = res.data.points_earned;

  // Atualiza pontos do usuário logado
  if (Auth.isLoggedIn() && currentUser && pts > 0) {
    currentUser.points = (currentUser.points||0) + pts;
    localStorage.setItem('taberna_user', JSON.stringify(currentUser));
  }

  // Gera mensagem WhatsApp
  const payLabel = PAYMENT_METHODS.find(function(m){ return m.id===checkoutState.paymentMethod; });
  const itemsText = items.map(function(obj) {
    return obj.qty + 'x ' + obj.drink.name + ' – ' + toBRL((obj.drink.salePrice||obj.drink.price)*obj.qty);
  }).join('%0A');

  let msg = '*Novo Pedido Rock Burger %23' + orderId + '*%0A%0A';
  msg += '*Itens:*%0A' + itemsText + '%0A%0A';
  if (discount > 0) msg += '*Desconto (' + checkoutState.couponCode + '):* − ' + toBRL(discount) + '%0A';
  msg += '*Total: ' + toBRL(total) + '*%0A';
  msg += '*Pagamento:* ' + (payLabel ? payLabel.label : checkoutState.paymentMethod) + '%0A';
  msg += '*Endereço:* ' + (addressText||'Retirada') + '%0A';
  if (guestName)  msg += '*Cliente:* ' + guestName + '%0A';
  if (guestPhone) msg += '*Telefone:* ' + guestPhone;

  const waUrl = 'https://wa.me/' + WHATSAPP_OWNER + '?text=' + msg;

  // Limpa carrinho e estado
  Object.keys(cart).forEach(function(k){ delete cart[k]; });
  checkoutState.couponCode     = '';
  checkoutState.couponDiscount = 0;
  updateCartBadge();

  showToast('Pedido #' + orderId + ' confirmado!' + (pts>0?' +'+pts+' pts':''), 'success');

  // Abre WhatsApp em nova aba
  window.open(waUrl, '_blank');

  // Volta para home
  setTimeout(function() {
    document.querySelector('.botonBar .list[data-target="home"]')?.click();
  }, 1500);
}


/* ═══════════════════════════════════════════════════════════
   FAVORITOS
   ═══════════════════════════════════════════════════════════ */
async function syncFavoritesFromServer() {
  if (!Auth.isLoggedIn()) return;
  const res = await api('GET', '/favorites');
  if (res.ok) {
    favorites.clear();
    res.data.forEach(f => favorites.add(f.product_key));
  }
}

async function toggleFavorite(key) {
  if (favorites.has(key)) {
    favorites.delete(key);
    if (Auth.isLoggedIn()) await api('DELETE', '/favorites/' + encodeURIComponent(key));
    showToast('Removido dos favoritos.', 'info');
  } else {
    favorites.add(key);
    if (Auth.isLoggedIn()) await api('POST', '/favorites', { product_key: key });
    showToast('Adicionado aos favoritos! ★', 'success');
  }
}

function renderFavorites() {
  const grid  = document.getElementById('favorites-grid');
  const empty = document.getElementById('favorites-empty');
  if (!grid) return;
  const items = DRINKS.filter(d => favorites.has(d.key));
  if (items.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = items.map((d,i) => gridCardHTML(d, i, { removeFav:true })).join('');
  bindGridEvents(grid);
}


/* ═══════════════════════════════════════════════════════════
   DESCONTOS  (produtos com promocao=1 do banco)
   ═══════════════════════════════════════════════════════════ */
let activeDealCategory = 'todos';

const DEAL_CATEGORIES = [
  { id: 'todos',            label: 'Todos' },
  { id: 'LANCHES',          label: 'Lanches' },
  { id: 'COMBOS',           label: 'Combos' },
  { id: 'ACOMPANHAMENTOS',  label: 'Acompanhamentos' },
  { id: 'BEBIDAS',          label: 'Bebidas' },
  { id: 'INGREDIENTES',     label: 'Ingredientes' },
];

function dealDiscountPct(d) {
  if (!d.onSale || !d.salePrice || !d.price) return 0;
  return Math.round((1 - d.salePrice / d.price) * 100);
}

function renderDealFilters() {
  const track = document.getElementById('deal-cat-track');
  if (!track) return;
  // Só mostra categorias que de fato têm produtos em oferta
  const present = new Set(DEALS.map(d => d.category));
  const cats = DEAL_CATEGORIES.filter(c => c.id === 'todos' || present.has(c.id));

  track.innerHTML = cats.map(c => `
    <button class="deal-chip ${c.id === activeDealCategory ? 'active' : ''}" data-cat="${c.id}">
      ${c.label}
    </button>
  `).join('');

  track.querySelectorAll('.deal-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      activeDealCategory = this.dataset.cat;
      renderDealFilters();
      renderDealsGrid();
    });
  });
}

function renderDealsGrid() {
  const grid = document.getElementById('deals-grid');
  if (!grid) return;

  const filtered = DEALS
    .filter(d => activeDealCategory === 'todos' || d.category === activeDealCategory)
    .sort((a, b) => dealDiscountPct(b) - dealDiscountPct(a)); // maior desconto primeiro

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-state__icon">🏷️</span>
        <p class="empty-state__text">Nenhuma oferta nessa categoria.</p>
        <p class="empty-state__sub">Volte mais tarde ou veja outras categorias.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map((d, i) => gridCardHTML(d, i)).join('');
  bindGridEvents(grid);
}

function renderDealBanner() {
  const eyebrow = document.querySelector('.deal-banner__eyebrow');
  const title   = document.querySelector('.deal-banner__title');
  const banner  = document.querySelector('.deal-banner');

  if (DEALS.length === 0) {
    if (title)   title.textContent   = 'Sem ofertas agora';
    if (eyebrow) eyebrow.textContent = 'Volte em breve';
    banner?.classList.add('deal-banner--empty');
    return;
  }

  banner?.classList.remove('deal-banner--empty');
  const maxDiscount = Math.max(...DEALS.map(dealDiscountPct));
  if (title)   title.textContent   = `Até ${maxDiscount}% OFF`;
  if (eyebrow) eyebrow.textContent = `${DEALS.length} produto${DEALS.length>1?'s':''} em oferta relâmpago`;
}

function renderDeals() {
  renderDealBanner();
  renderDealFilters();
  renderDealsGrid();
}

/* ═══════════════════════════════════════════════════════════
   TIMER DE DESCONTOS — contagem real até a oferta mais próxima
   de expirar (vem do banco, persiste entre recarregamentos)
   ═══════════════════════════════════════════════════════════ */
let dealTimerInterval = null;

function getSoonestExpiry() {
  const withExpiry = DEALS
    .map(d => d.dealExpiresAt ? new Date(d.dealExpiresAt.replace(' ', 'T')) : null)
    .filter(Boolean);
  if (withExpiry.length === 0) return null;
  return new Date(Math.min(...withExpiry));
}

function initDealTimer() {
  const pad = n => String(Math.max(0, n)).padStart(2, '0');
  const timerWrap = document.getElementById('deal-timer');

  function tick() {
    const soonest = getSoonestExpiry();
    const th = document.getElementById('t-h'),
          tm = document.getElementById('t-m'),
          ts = document.getElementById('t-s');

    if (!soonest) {
      // Sem oferta com expiração — esconde o timer
      if (timerWrap) timerWrap.style.display = 'none';
      return;
    }
    timerWrap && (timerWrap.style.display = 'inline-flex');

    const diffSec = Math.floor((soonest - new Date()) / 1000);
    if (diffSec <= 0) {
      // Oferta expirou — recarrega a lista de ofertas
      clearInterval(dealTimerInterval);
      loadCatalog().then(renderDeals);
      return;
    }
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (th) th.textContent = pad(h);
    if (tm) tm.textContent = pad(m);
    if (ts) ts.textContent = pad(s);
  }

  tick();
  clearInterval(dealTimerInterval);
  dealTimerInterval = setInterval(tick, 1000);
}

/* ═══════════════════════════════════════════════════════════
   PERFIL
   ═══════════════════════════════════════════════════════════ */
function renderProfile() {
  const screen = document.querySelector('[data-screen="perfil"]');
  if (!screen) return;
  if (!Auth.isLoggedIn()) {
    screen.innerHTML = buildAuthForm();
    bindAuthFormEvents();
    return;
  }
  screen.innerHTML = buildProfileScreen();
  bindProfileEvents();
  loadProfileData();
}

/* ── Formulário de Auth ──────────────────────────────────── */
function buildAuthForm() {
  return `
  <div class="page-wrapper">
    <div class="auth-card">
      <div class="auth-card__logo">Rock Burger</div>
      <p class="auth-card__tagline">Seus lanches favoritos, sempre à mão.</p>
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab auth-tab--active" data-tab="login"    role="tab" aria-selected="true">Entrar</button>
        <button class="auth-tab"                  data-tab="register" role="tab" aria-selected="false">Cadastrar</button>
        <div class="auth-tab__indicator"></div>
      </div>
      <!-- LOGIN -->
      <form id="form-login" class="auth-form" novalidate>
        <div class="field-group">
          <label for="login-email">E-mail</label>
          <input id="login-email" type="email" placeholder="seu@email.com" autocomplete="email" required/>
        </div>
        <div class="field-group">
          <label for="login-pass">Senha</label>
          <div class="field-group__pass">
            <input id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password" required/>
            <button type="button" class="btn-eye" data-target="login-pass">👁</button>
          </div>
        </div>
        <p class="auth-error" id="login-error" aria-live="polite"></p>
        <button type="submit" class="btn-primary btn-auth" id="btn-login">Entrar</button>
      </form>
      <!-- CADASTRO -->
      <form id="form-register" class="auth-form auth-form--hidden" novalidate>
        <div class="field-group">
          <label for="reg-name">Nome completo</label>
          <input id="reg-name" type="text" placeholder="João da Silva" autocomplete="name" required/>
        </div>
        <div class="field-group">
          <label for="reg-email">E-mail</label>
          <input id="reg-email" type="email" placeholder="seu@email.com" autocomplete="email" required/>
        </div>
        <div class="field-group">
          <label for="reg-phone">WhatsApp / Telefone</label>
          <input id="reg-phone" type="tel" placeholder="(44) 99999-9999" autocomplete="tel" required/>
        </div>
        <div class="field-group">
          <label for="reg-pass">Senha <small>(mín. 6 caracteres)</small></label>
          <div class="field-group__pass">
            <input id="reg-pass" type="password" placeholder="••••••••" autocomplete="new-password" required minlength="6"/>
            <button type="button" class="btn-eye" data-target="reg-pass">👁</button>
          </div>
        </div>
        <p class="auth-error" id="reg-error" aria-live="polite"></p>
        <button type="submit" class="btn-primary btn-auth" id="btn-register">Criar Conta</button>
      </form>
      <button class="btn-guest" id="btn-guest">Continuar sem login →</button>
    </div>
  </div>`;
}

function bindAuthFormEvents() {
  // Tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.auth-tab').forEach(t => { t.classList.remove('auth-tab--active'); t.setAttribute('aria-selected','false'); });
      this.classList.add('auth-tab--active'); this.setAttribute('aria-selected','true');
      const w = this.dataset.tab;
      document.getElementById('form-login')?.classList.toggle('auth-form--hidden', w!=='login');
      document.getElementById('form-register')?.classList.toggle('auth-form--hidden', w!=='register');
      const ind = document.querySelector('.auth-tab__indicator');
      if (ind) ind.style.transform = w==='login' ? 'translateX(0)' : 'translateX(100%)';
    });
  });
  // Olho
  document.querySelectorAll('.btn-eye').forEach(btn => {
    btn.addEventListener('click', function() {
      const inp = document.getElementById(this.dataset.target);
      if (!inp) return;
      inp.type = inp.type==='password' ? 'text' : 'password';
      this.textContent = inp.type==='password' ? '👁' : '🙈';
    });
  });
  // Login submit
  document.getElementById('form-login')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl=document.getElementById('login-error'), btn=document.getElementById('btn-login');
    errEl.textContent=''; btn.textContent='Entrando…'; btn.disabled=true;
    const res = await api('POST','/auth/login',{
      email:document.getElementById('login-email').value.trim(),
      password:document.getElementById('login-pass').value,
    });
    if (res.ok) {
      Auth.save(res.data.token, res.data.user);
      await syncFavoritesFromServer();
      showToast(`Bem-vindo, ${res.data.user.name}! 🍺`, 'success');
      renderProfile();
    } else { errEl.textContent=res.error??'Erro ao fazer login.'; btn.textContent='Entrar'; btn.disabled=false; }
  });
  // Cadastro submit
  document.getElementById('form-register')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl=document.getElementById('reg-error'), btn=document.getElementById('btn-register');
    errEl.textContent=''; btn.textContent='Criando conta…'; btn.disabled=true;
    const res = await api('POST','/auth/register',{
      name:document.getElementById('reg-name').value.trim(),
      email:document.getElementById('reg-email').value.trim(),
      phone:document.getElementById('reg-phone').value.trim(),
      password:document.getElementById('reg-pass').value,
    });
    if (res.ok) {
      Auth.save(res.data.token, res.data.user);
      showToast(`Conta criada! Bem-vindo(a), ${res.data.user.name} 🎉`,'success');
      renderProfile();
    } else { errEl.textContent=res.error??'Erro ao cadastrar.'; btn.textContent='Criar Conta'; btn.disabled=false; }
  });
  // Visitante
  document.getElementById('btn-guest')?.addEventListener('click',() => {
    document.querySelector('.botonBar .list[data-target="home"]')?.click();
  });
}

/* ── Tela de perfil logado ──────────────────────────────── */
function buildProfileScreen() {
  const u = currentUser ?? {};
  const initial = (u.name??'U')[0].toUpperCase();
  return `
  <div class="page-wrapper">
    <div class="profile-hero">
      <div class="profile-hero__avatar">
        ${u.avatar
          ? `<img src="${u.avatar}" alt="Avatar" width="80" height="80"/>`
          : `<span class="profile-hero__avatar-initial">${initial}</span>`}
      </div>
      <div class="profile-hero__info">
        <h2 class="profile-hero__name" id="ph-name">${u.name??'Usuário'}</h2>
        <p class="profile-hero__email">${u.email??''}</p>
        <span class="profile-hero__badge" id="ph-badge">${u.badge??'Cliente Bronze'}</span>
      </div>
    </div>
    <div class="profile-stats">
      <div class="profile-stat">
        <span class="profile-stat__value" id="ph-orders">–</span>
        <span class="profile-stat__label">Pedidos</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value" id="ph-favs">–</span>
        <span class="profile-stat__label">Favoritos</span>
      </div>
      <div class="profile-stat">
        <span class="profile-stat__value" id="ph-points">${u.points??0}</span>
        <span class="profile-stat__label">Pontos</span>
      </div>
    </div>
    <div class="profile-sections">
      <div class="profile-section-tabs">
        <button class="psec-tab psec-tab--active" data-section="orders">Pedidos</button>
        <button class="psec-tab" data-section="addresses">Endereços</button>
        <button class="psec-tab" data-section="account">Minha Conta</button>
      </div>
      <!-- PEDIDOS -->
      <div class="psec-panel psec-panel--active" id="panel-orders">
        <div class="loading-row" id="orders-loading">Carregando pedidos…</div>
        <div id="orders-list"></div>
        <div id="orders-empty" class="empty-state" style="display:none">
          <span class="empty-state__icon">📦</span>
          <p class="empty-state__text">Nenhum pedido ainda.</p>
        </div>
      </div>
      <!-- ENDEREÇOS -->
      <div class="psec-panel" id="panel-addresses">
        <div class="loading-row" id="addr-loading">Carregando endereços…</div>
        <div id="addresses-list"></div>
        <button class="btn-add-addr" id="btn-add-addr">＋ Novo Endereço</button>
        <div class="addr-form-wrap" id="addr-form-wrap" style="display:none">
          <h3 class="addr-form__title">Novo Endereço</h3>
          <div class="addr-form">
            <div class="field-group"><label for="af-street">Rua / Avenida</label><input id="af-street" type="text" placeholder="Rua das Flores"/></div>
            <div class="field-group field-group--half"><label for="af-number">Número</label><input id="af-number" type="text" placeholder="123"/></div>
            <div class="field-group field-group--half"><label for="af-comp">Complemento</label><input id="af-comp" type="text" placeholder="Apto 4B (opcional)"/></div>
            <label class="check-row"><input type="checkbox" id="af-default"/> Definir como padrão</label>
            <p class="auth-error" id="addr-error" aria-live="polite"></p>
            <div class="addr-form__actions">
              <button class="btn-secondary" id="btn-cancel-addr">Cancelar</button>
              <button class="btn-primary"   id="btn-save-addr">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <!-- MINHA CONTA -->
      <div class="psec-panel" id="panel-account">
        <div class="account-form">
          <div class="field-group"><label for="acc-name">Nome</label><input id="acc-name" type="text" value="${u.name??''}"/></div>
          <div class="field-group">
            <label for="acc-phone">WhatsApp / Telefone</label>
            <input id="acc-phone" type="tel" placeholder="(44) 99999-9999" value="${u.phone??''}"/>
          </div>
          <div class="field-group">
            <label for="acc-email">E-mail</label>
            <input id="acc-email" type="email" value="${u.email??''}" disabled/>
            <small class="field-hint">O e-mail não pode ser alterado.</small>
          </div>
          <p class="auth-error" id="acc-error" aria-live="polite"></p>
          <button class="btn-primary" id="btn-save-account">Salvar Alterações</button>
        </div>
        <div class="profile-menu" style="margin-top:var(--spacing-lg)">
          <button class="profile-menu__item profile-menu__item--danger" id="btn-logout">
            <span class="profile-menu__icon">🚪</span>
            <span class="profile-menu__label">Sair da conta</span>
            <span class="profile-menu__arrow">›</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function bindProfileEvents() {
  // Abas
  document.querySelectorAll('.psec-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.psec-tab').forEach(t => t.classList.remove('psec-tab--active'));
      document.querySelectorAll('.psec-panel').forEach(p => p.classList.remove('psec-panel--active'));
      this.classList.add('psec-tab--active');
      document.getElementById(`panel-${this.dataset.section}`)?.classList.add('psec-panel--active');
    });
  });
  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await api('POST','/auth/logout');
    Auth.clear(); favorites.clear();
    showToast('Você saiu da conta.','info');
    renderProfile();
  });
  // Salvar conta
  document.getElementById('btn-save-account')?.addEventListener('click', async () => {
    const name=document.getElementById('acc-name')?.value.trim();
    const phone=document.getElementById('acc-phone')?.value.trim();
    const errEl=document.getElementById('acc-error');
    if (!name) { errEl.textContent='Nome não pode ser vazio.'; return; }
    errEl.textContent='';
    const res = await api('PUT','/profile',{name, phone});
    if (res.ok) {
      currentUser.name=name;
      currentUser.phone=phone;
      localStorage.setItem('taberna_user',JSON.stringify(currentUser));
      document.getElementById('ph-name').textContent=name;
      showToast('Perfil atualizado! ✔','success');
    } else errEl.textContent=res.error??'Erro ao salvar.';
  });
  // Novo endereço
  document.getElementById('btn-add-addr')?.addEventListener('click', () => {
    document.getElementById('addr-form-wrap').style.display='block';
    document.getElementById('btn-add-addr').style.display='none';
  });
  document.getElementById('btn-cancel-addr')?.addEventListener('click', () => {
    document.getElementById('addr-form-wrap').style.display='none';
    document.getElementById('btn-add-addr').style.display='block';
  });
  // Salvar endereço
  document.getElementById('btn-save-addr')?.addEventListener('click', async () => {
    const errEl=document.getElementById('addr-error'); errEl.textContent='';
    const payload={
      street:document.getElementById('af-street')?.value.trim(),
      number:document.getElementById('af-number')?.value.trim(),
      complement:document.getElementById('af-comp')?.value.trim(),
      zip:'00000-000',
      district:'N/A',
      city:'N/A',
      state:'BR',
      label:'Casa',
      is_default:document.getElementById('af-default')?.checked?1:0,
    };
    if (!payload.street || !payload.number) { errEl.textContent='Preencha rua e número.'; return; }
    const res=await api('POST','/addresses',payload);
    if (res.ok) {
      showToast('Endereço salvo! 📍','success');
      document.getElementById('addr-form-wrap').style.display='none';
      document.getElementById('btn-add-addr').style.display='block';
      loadAddresses();
    } else errEl.textContent=res.error??'Erro ao salvar endereço.';
  });
}

async function loadProfileData() {
  const [profileRes] = await Promise.all([api('GET','/profile'), loadOrders(), loadAddresses()]);
  if (profileRes.ok) {
    const d=profileRes.data;
    ['ph-name','ph-badge','ph-orders','ph-favs','ph-points'].forEach(id => {
      const el=document.getElementById(id); if (!el) return;
      const map={'ph-name':d.name,'ph-badge':d.badge,'ph-orders':d.order_count,'ph-favs':d.fav_count,'ph-points':d.points};
      el.textContent=map[id];
    });
    currentUser={...currentUser,...d};  // d já inclui phone vindo da API
    localStorage.setItem('taberna_user',JSON.stringify(currentUser));
  }
}

async function loadOrders() {
  const loading=document.getElementById('orders-loading');
  const list=document.getElementById('orders-list');
  const empty=document.getElementById('orders-empty');
  if (!list) return;
  const res=await api('GET','/orders');
  if (loading) loading.style.display='none';
  if (!res.ok||!res.data||res.data.length===0) { if(empty) empty.style.display='flex'; return; }
  const SL={'pendente':'Pendente','confirmado':'Confirmado','em_preparo':'Em preparo','em_entrega':'Em entrega','entregue':'Entregue','cancelado':'Cancelado'};
  const SC={'pendente':'#ff2d95','confirmado':'#4caf50','em_preparo':'#2196f3','em_entrega':'#9c27b0','entregue':'#8bc34a','cancelado':'#e05555'};
  list.innerHTML=res.data.map(o=>`
    <div class="order-card">
      <div class="order-card__head">
        <span class="order-card__id">Pedido #${o.id}</span>
        <span class="order-card__status" style="color:${SC[o.status]??'#fff'}">${SL[o.status]??o.status}</span>
      </div>
      <p class="order-card__items">${o.items_summary??'–'}</p>
      <div class="order-card__foot">
        <span class="order-card__total">${toBRL(Number(o.total))}</span>
        <span class="order-card__date">${new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  `).join('');
}

async function loadAddresses() {
  const loading=document.getElementById('addr-loading');
  const list=document.getElementById('addresses-list');
  if (!list) return;
  const res=await api('GET','/addresses');
  if (loading) loading.style.display='none';
  if (!res.ok||!res.data||res.data.length===0) { list.innerHTML='<p class="addr-empty">Nenhum endereço cadastrado.</p>'; return; }
  list.innerHTML=res.data.map(a=>`
    <div class="addr-card ${a.is_default?'addr-card--default':''}">
      <div class="addr-card__head">
        <span class="addr-card__label">${a.label}</span>
        ${a.is_default?'<span class="addr-card__default-tag">Padrão</span>':''}
      </div>
      <p class="addr-card__line">${a.street}, ${a.number}${a.complement?` – ${a.complement}`:''}</p>
      <p class="addr-card__line">${a.district} – ${a.city}/${a.state} – CEP ${a.zip}</p>
      <button class="addr-card__remove" data-id="${a.id}" aria-label="Remover">✕ Remover</button>
    </div>
  `).join('');
  list.querySelectorAll('.addr-card__remove').forEach(btn=>{
    btn.addEventListener('click',async function(){
      const r=await api('DELETE',`/addresses/${this.dataset.id}`);
      if(r.ok){showToast('Endereço removido.','info');loadAddresses();}
      else showToast(r.error??'Erro ao remover.','error');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function() {
  Auth.load();
  initSwiper();
  initBottomBar();
  await loadCatalog();       // carrega produtos do banco → renderBrands + renderGrid
  initDealTimer();
  if (Auth.isLoggedIn()) syncFavoritesFromServer();
});
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

// Categorias do cardápio (fixas — não dependem dos produtos carregados)
const CATEGORIES = [
  { id:'todos',            label:'Todos',   icon:'apps-outline' },
  { id:'LANCHES',          label:'Lanches', icon:'fast-food-outline' },
  { id:'COMBOS',           label:'Combos',  icon:'layers-outline' },
  { id:'ACOMPANHAMENTOS',  label:'Acomp.',  icon:'restaurant-outline' },
  { id:'BEBIDAS',          label:'Bebidas', icon:'cafe-outline' },
];
// INGREDIENTES não é uma categoria navegável (nem aba própria, nem dentro de
// "Todos") — esses produtos só existem pra alimentar a seção "Quer
// adicionar algo?" dentro da tela de detalhe dos lanches.

let activeCategory = 'todos';
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
    // Só as bebidas mostram o volume ao lado do nome (ex.: "Coca-Cola
    // 350ml") — nas outras categorias o peso/tamanho fica só nos bastidores.
    name:       row.table_name === 'BEBIDAS'
                  ? row.nome + ' ' + row.ml + 'ml'
                  : row.nome,
    baseName:   row.nome,
    description: row.descricao || '',
    ingredients: (row.ingredientes || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean),
    // Nos COMBOS esse campo foi reaproveitado: guarda o tamanho (ml) do
    // refrigerante que o combo oferece (350 = lata, 600 = garrafa), pra
    // bater com o `ml` real das BEBIDAS e filtrar os sabores disponíveis.
    ml:         Number(row.ml) || 0,
    price:      Number(row.preco),
    salePrice:  onSale ? Number(row.valor_promocional) : null,
    onSale:     onSale,
    dealExpiresAt: row.promocao_expira_em || null,
    stars:      Math.round(Number(row.rate || 4)),
    badge:      null, // tag "Vegetariano" removida do card/tela de produto
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

  renderCategories();
  renderGrid();
  renderCarousel();
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

// Placeholder de imagem gerado localmente (SVG inline) — sem depender de
// serviços externos como via.placeholder.com (que saiu do ar).
function placeholderImg(text, w, h, bg, fg) {
  bg = bg || '1a1a1a'; fg = fg || 'ffffff';
  const fontSize = Math.max(10, Math.round(Math.min(w, h) * 0.11));
  const label = encodeURIComponent(String(text == null ? '' : text).slice(0, 18));
  const cx = Math.round(w / 2), cy = Math.round(h / 2);
  let svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "'>" +
            "<rect width='" + w + "' height='" + h + "' fill='#" + bg + "'/>" +
            "<text x='" + cx + "' y='" + cy + "' dominant-baseline='middle' text-anchor='middle' fill='#" + fg + "' font-family='sans-serif' font-size='" + fontSize + "'>" + label + "</text></svg>";
  // Codifica aspas simples também: essa string às vezes é embutida dentro de
  // atributos HTML que já usam aspas simples (onerror="this.src='...'"),
  // então não podemos deixar aspas simples literais no meio do data URI.
  svg = svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/'/g, '%27');
  return 'data:image/svg+xml,' + svg;
}

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
let _carouselSwiper = null;

// Monta os slides do carrossel do topo com produtos reais do banco:
// alguns combos + alguns acompanhamentos em destaque.
function renderCarousel() {
  const wrap = document.getElementById('carousel-wrapper');
  if (!wrap) return;

  const combos = DRINKS.filter(function(d) { return d.category === 'COMBOS'; }).slice(0, 3);
  const sides  = DRINKS.filter(function(d) { return d.category === 'ACOMPANHAMENTOS'; }).slice(0, 3);
  const slides = combos.concat(sides);

  if (!slides.length) { wrap.innerHTML = ''; return; }

  wrap.innerHTML = slides.map(function(d) {
    const finalPrice = d.onSale && d.salePrice ? d.salePrice : d.price;
    const hasDetail  = d.category === 'LANCHES' || d.category === 'COMBOS';
    const openAttr   = hasDetail ? ` onclick="openProductDetail('${d.key}')" style="cursor:pointer"` : '';
    return `
      <div class="swiper-slide">
        <article class="product-card" data-key="${d.key}">
          <div class="product-card__image"${openAttr}>
            <img src="${d.img}" alt="${d.name}" loading="lazy" width="200" height="320"
                 onerror="this.onerror=null;this.src='/src/img/default-produto.svg'"/>
          </div>
          <div class="product-card__info">
            <h2 class="product-card__name"${openAttr}>${d.name}</h2>
            <div class="product-card__rating" aria-label="Avaliação: ${d.stars} estrelas">${toStars(d.stars)}</div>
          </div>
          <div class="product-card__footer">
            <span class="product-card__price">${toBRL(finalPrice)}</span>
            <button class="product-card__button" data-key="${d.key}">Comprar</button>
          </div>
        </article>
      </div>`;
  }).join('');

  wrap.querySelectorAll('.product-card__button').forEach(function(btn) {
    btn.addEventListener('click', function() { addToCart(this.dataset.key); });
  });

  if (_carouselSwiper) { _carouselSwiper.update(); _carouselSwiper.slideTo(0); }
}

function initSwiper() {
  _carouselSwiper = new Swiper('.swiper-container', {
    loop:true, slidesPerView:2, spaceBetween:24, speed:400,
    navigation:{ nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev' },
    pagination:{ el:'.swiper-pagination', clickable:true, dynamicBullets:true },
    keyboard:{ enabled:true, onlyInViewport:true },
    a11y:{ prevSlideMessage:'Produto anterior', nextSlideMessage:'Próximo produto' },
    breakpoints:{ 768:{ slidesPerView:3 }, 1024:{ slidesPerView:4 } },
    on:{ init() { this.slides.forEach(s => s.setAttribute('tabindex','0')); } },
  });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => _carouselSwiper.update(), 250); });
}

/* ═══════════════════════════════════════════════════════════
   TOPO — AVATAR + SAUDAÇÃO DA HOME
   ═══════════════════════════════════════════════════════════ */
function renderTopbarAvatar() {
  const btn = document.getElementById('topbar-avatar');
  if (!btn) return;
  if (Auth.isLoggedIn() && currentUser) {
    const initial = (currentUser.name ?? 'U')[0].toUpperCase();
    btn.innerHTML = currentUser.avatar
      ? `<img src="${currentUser.avatar}" alt="Avatar"/>`
      : `<span class="topBar__avatar-initial">${initial}</span>`;
  } else {
    btn.innerHTML = `<ion-icon name="person-outline"></ion-icon>`;
  }
}

function renderHomeGreeting() {
  const el = document.getElementById('home-greeting');
  if (!el) return;
  const firstName = (Auth.isLoggedIn() && currentUser && currentUser.name)
    ? currentUser.name.split(' ')[0] : null;
  el.innerHTML = `
    <p class="home-greeting__hi">${firstName ? 'Olá, ' + firstName : 'Bem-vindo'} 👋</p>
    <h1 class="home-greeting__title">Boa fome,<br/><span>bom humor!</span></h1>
  `;
}

/* ═══════════════════════════════════════════════════════════
   FILTRO DE CATEGORIAS
   ═══════════════════════════════════════════════════════════ */
function renderCategories() {
  const track = document.getElementById('brand-track');
  if (!track) return;
  track.innerHTML = CATEGORIES.map(c => `
    <button class="brand-chip ${c.id===activeCategory?'active':''}"
            data-category="${c.id}" aria-pressed="${c.id===activeCategory}"
            aria-label="Filtrar por ${c.label}">
      <span class="brand-chip__logo">
        <ion-icon name="${c.icon}"></ion-icon>
      </span>
      <span class="brand-chip__label">${c.label}</span>
    </button>
  `).join('');
  track.querySelectorAll('.brand-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      activeCategory = this.dataset.category;
      renderCategories();
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
  const hasDetail  = d.category === 'LANCHES' || d.category === 'COMBOS';
  const detailAttr = hasDetail ? ` onclick="openProductDetail('${d.key}')"` : '';

  return `
    <article class="grid-card" data-brand="${d.brand}" data-category="${d.category}" data-key="${d.key}"
             style="animation-delay:${i*0.04}s">
      <div class="grid-card__image-wrap"${hasDetail ? ' style="cursor:pointer"' : ''}${detailAttr}>
        ${d.badge && !discount ? `<span class="grid-card__badge">${d.badge}</span>` : ''}
        ${discount            ? `<span class="grid-card__discount-badge">-${discount}%</span>` : ''}
        <button class="grid-card__fav-btn ${isFav?'active':''}" data-key="${d.key}"
                aria-label="${isFav?'Remover dos':'Adicionar aos'} favoritos"
                aria-pressed="${isFav}">
          ${isFav ? '★' : '☆'}
        </button>
        ${removeFav ? `<button class="grid-card__fav-remove" data-key="${d.key}" aria-label="Remover dos favoritos">★</button>` : ''}
        <img src="${d.img}" alt="${d.name}" loading="lazy" width="200" height="280"
             onerror="this.onerror=null;this.src='/src/img/default-produto.svg'"/>
      </div>
      <div class="grid-card__body">
        <h3 class="grid-card__name"${hasDetail ? ' style="cursor:pointer"' : ''}${detailAttr}>${d.name}</h3>
        ${d.description ? `<p class="grid-card__desc">${d.description}</p>` : ''}
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

// Catálogo navegável: exclui INGREDIENTES (são só os extras dos lanches,
// não aparecem como produto próprio em nenhuma aba nem em "Todos").
function browsableCatalog() {
  return DRINKS.filter(function(d) { return d.category !== 'INGREDIENTES'; });
}

function renderGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  grid.innerHTML = browsableCatalog().map((d,i) => gridCardHTML(d,i)).join('');
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

/* ═══════════════════════════════════════════════════════════
   TELA DE DETALHE / PERSONALIZAR PRODUTO
   ═══════════════════════════════════════════════════════════ */
let pdState = null; // { key, qty, removed: Set<string>, added: { [ingredientKey]: qty }, drink: bebidaKey|null }

function ensurePDOverlay() {
  if (document.getElementById('pd-overlay')) return;
  const div = document.createElement('div');
  div.className = 'pd-overlay';
  div.id = 'pd-overlay';
  div.addEventListener('click', function(e) {
    if (e.target === div) closeProductDetail();
  });
  document.body.appendChild(div);
}

function openProductDetail(key) {
  const d = getDrinkByKey(key);
  if (!d) return;
  pdState = { key: key, qty: 1, removed: new Set(), added: {}, drink: null };
  renderProductDetail();
  document.getElementById('pd-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductDetail() {
  document.getElementById('pd-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  pdState = null;
}

// Pão e carne são a base do lanche — não fazem sentido como opção de
// retirada, então ficam de fora da lista de "Personalizar" (mas continuam
// aparecendo normalmente na lista de ingredientes/descrição).
function isLockedIngredient(ing) {
  const norm = ing.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return norm.indexOf('pao') !== -1 || norm.indexOf('carne') !== -1 || norm.indexOf('hamburguer') !== -1;
}

// Mostra a descrição do lanche como lista (um ingrediente por linha) em vez
// de um parágrafo corrido. Usa a lista de ingredientes já cadastrada; se o
// produto não tiver essa lista, cai pra separar a descrição por vírgulas.
function pdDescriptionListHTML(d) {
  const items = (d.ingredients && d.ingredients.length)
    ? d.ingredients
    : (d.description
        ? d.description.replace(/\.\s*$/, '').split(',').map(function(s){ return s.trim(); }).filter(Boolean)
        : []);
  if (!items.length) return '';
  return `<ul class="pd-desc-list">${items.map(function(i){ return `<li>${i}</li>`; }).join('')}</ul>`;
}

function renderProductDetail() {
  const root = document.getElementById('pd-overlay');
  if (!root || !pdState) return;
  const d = getDrinkByKey(pdState.key);
  if (!d) return;

  const discount   = d.onSale && d.salePrice ? Math.round((1 - d.salePrice / d.price) * 100) : 0;
  const finalPrice = discount ? d.price * (1 - discount / 100) : (d.salePrice ?? d.price);
  const isFav      = favorites.has(d.key);

  // Retirar ingrediente e adicionar extra só existem nos lanches. Pão e
  // carne saem da lista de retirada (são a base do lanche).
  const customizableIngredients = d.category === 'LANCHES'
    ? (d.ingredients || []).filter(function(ing) { return !isLockedIngredient(ing); })
    : [];
  const hasIngredients = customizableIngredients.length > 0;

  // Ingredientes extras disponíveis pra adicionar (categoria INGREDIENTES do cardápio)
  const availableAddons = d.category === 'LANCHES'
    ? DRINKS.filter(function(p) { return p.table === 'INGREDIENTES'; })
    : [];
  const addonsTotal = availableAddons.reduce(function(sum, ing) {
    const q = pdState.added[ing.key] || 0;
    return sum + ing.price * q;
  }, 0);

  // Combos: escolha do sabor do refrigerante (sem retirada, sem adicional).
  // d.ml no combo guarda o tamanho do refrigerante oferecido (350 = lata,
  // 600 = garrafa), que bate com o `ml` real de cada bebida cadastrada.
  const comboDrinkOptions = d.category === 'COMBOS'
    ? DRINKS.filter(function(p) { return p.table === 'BEBIDAS' && p.ml === d.ml; })
    : [];
  if (comboDrinkOptions.length && !pdState.drink) {
    pdState.drink = comboDrinkOptions[0].key;
  }

  const total = (finalPrice + addonsTotal) * pdState.qty;

  root.innerHTML = `
    <div class="pd-sheet">
      <div class="pd-hero">
        <button class="pd-icon-btn pd-back" id="pd-back" aria-label="Voltar">‹</button>
        <button class="pd-icon-btn pd-fav ${isFav?'active':''}" id="pd-fav" aria-label="${isFav?'Remover dos':'Adicionar aos'} favoritos">
          ${isFav ? '★' : '☆'}
        </button>
        <img src="${d.img}" alt="${d.name}"
             onerror="this.onerror=null;this.src='/src/img/default-produto.svg'"/>
      </div>
      <div class="pd-body">
        <div class="pd-panel">
          ${d.badge && !discount ? `<span class="pd-badge">${d.badge}</span>` : ''}
          ${discount ? `<span class="pd-badge pd-badge--sale">-${discount}%</span>` : ''}
          <div class="pd-title-row">
            <h2 class="pd-name">${d.name}</h2>
          </div>
          <div class="pd-sub-row">
            <div class="pd-rating" aria-label="Avaliação: ${d.stars} estrelas">${toStars(d.stars)}</div>
            <div class="pd-price-block">
              ${discount||d.onSale ? `<span class="pd-original-price">${toBRL(d.price)}</span>` : ''}
              <span class="pd-price">${toBRL(finalPrice)}</span>
            </div>
          </div>
          ${pdDescriptionListHTML(d)}

          <div class="pd-rate" id="pd-rate-widget"></div>

          ${hasIngredients ? `
          <div class="pd-customize">
            <h3 class="pd-customize__title">Personalizar</h3>
            <p class="pd-customize__hint">Desmarque o que não quiser no seu pedido.</p>
            <div class="pd-ingredient-list">
              ${customizableIngredients.map(function(ing) {
                const checked = !pdState.removed.has(ing);
                return `
                  <label class="pd-ingredient">
                    <span>${ing}</span>
                    <span class="pd-toggle">
                      <input type="checkbox" class="pd-ing-checkbox" data-ing="${ing}" ${checked?'checked':''}>
                      <span class="pd-toggle__track"><span class="pd-toggle__thumb"></span></span>
                    </span>
                  </label>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${availableAddons.length ? `
          <div class="pd-addons">
            <h3 class="pd-addons__title">Quer adicionar algo?</h3>
            <p class="pd-customize__hint">Ingredientes extras, cobrados à parte.</p>
            <div class="pd-addon-list">
              ${availableAddons.map(function(ing) {
                const qty = pdState.added[ing.key] || 0;
                return `
                  <div class="pd-addon-row">
                    <div class="pd-addon-row__info">
                      <span class="pd-addon-row__name">${ing.baseName || ing.name}</span>
                      <span class="pd-addon-row__price">+ ${toBRL(ing.price)}</span>
                    </div>
                    <div class="pd-addon-row__qty">
                      <button class="pd-addon-row__btn" data-action="dec" data-id="${ing.key}" aria-label="Diminuir ${ing.baseName||ing.name}">−</button>
                      <span>${qty}</span>
                      <button class="pd-addon-row__btn" data-action="inc" data-id="${ing.key}" aria-label="Aumentar ${ing.baseName||ing.name}">+</button>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${comboDrinkOptions.length ? `
          <div class="pd-combo-drink">
            <h3 class="pd-addons__title">Escolha seu refrigerante</h3>
            <p class="pd-customize__hint">${d.ml === 600 ? 'Garrafa 600ml inclusa no combo.' : 'Lata inclusa no combo.'}</p>
            <div class="pd-drink-options">
              ${comboDrinkOptions.map(function(opt) {
                const selected = pdState.drink === opt.key;
                return `
                  <label class="pd-drink-option ${selected?'active':''}">
                    <input type="radio" name="pd-drink" value="${opt.key}" ${selected?'checked':''}>
                    <img src="${opt.img}" alt="${opt.baseName||opt.name}"
                         onerror="this.onerror=null;this.src='/src/img/default-produto.svg'"/>
                    <span>${opt.baseName || opt.name}</span>
                  </label>`;
              }).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
      <div class="pd-footer">
        <div class="pd-qty">
          <button class="pd-qty__btn" id="pd-qty-dec" aria-label="Diminuir">−</button>
          <span id="pd-qty-val">${pdState.qty}</span>
          <button class="pd-qty__btn" id="pd-qty-inc" aria-label="Aumentar">+</button>
        </div>
        <button class="pd-add-btn" id="pd-add-btn">Adicionar · ${toBRL(total)}</button>
      </div>
    </div>
  `;

  bindProductDetailEvents();
  loadPdRating(d);
}

/* ── Avaliação por estrelas (só quem já comprou) ─────────────── */
async function loadPdRating(d) {
  const el = document.getElementById('pd-rate-widget');
  if (!el) return;

  if (!Auth.isLoggedIn()) {
    el.innerHTML = `<p class="pd-rate__hint">Entre na sua conta pra avaliar esse lanche.</p>`;
    return;
  }

  el.innerHTML = `<p class="pd-rate__hint">Carregando avaliação…</p>`;
  const res = await api('GET', `/ratings/status?table=${encodeURIComponent(d.table)}&product_id=${d.id}`);

  // Se o cliente já fechou o modal ou trocou de produto enquanto carregava, ignora.
  if (!pdState || pdState.key !== d.key) return;

  if (!res.ok) { el.innerHTML = ''; return; }

  if (!res.data.can_rate) {
    el.innerHTML = `<p class="pd-rate__hint">Compre esse lanche pra poder avaliar.</p>`;
    return;
  }

  renderPdRateStars(res.data.my_rating || 0);
}

function renderPdRateStars(current) {
  const el = document.getElementById('pd-rate-widget');
  if (!el) return;
  el.innerHTML = `
    <p class="pd-rate__hint">${current ? 'Sua avaliação:' : 'Avalie esse lanche:'}</p>
    <div class="pd-rate__stars">
      ${[1,2,3,4,5].map(function(n) {
        return `<button class="pd-rate__star ${n<=current?'active':''}" data-n="${n}"
                        aria-label="${n} estrela${n>1?'s':''}">★</button>`;
      }).join('')}
    </div>
  `;
  el.querySelectorAll('.pd-rate__star').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (!pdState) return;
      const n = Number(this.dataset.n);
      const d = getDrinkByKey(pdState.key);
      if (!d) return;
      const res = await api('POST', '/ratings', { table_name: d.table, product_id: d.id, stars: n });
      if (res.ok) {
        showToast('Avaliação enviada! Obrigado 🤘', 'success');
        d.stars = Math.round(res.data.average);
        renderPdRateStars(n);
        const ratingEl = document.querySelector('#pd-overlay .pd-rating');
        if (ratingEl) ratingEl.innerHTML = toStars(d.stars);
      } else {
        showToast(res.error || 'Erro ao avaliar', 'error');
      }
    });
  });
}

function bindProductDetailEvents() {
  const root = document.getElementById('pd-overlay');
  if (!root) return;

  root.querySelector('#pd-back')?.addEventListener('click', closeProductDetail);

  root.querySelector('#pd-fav')?.addEventListener('click', async function() {
    if (!pdState) return;
    await toggleFavorite(pdState.key);
    renderProductDetail();
  });

  root.querySelectorAll('.pd-ing-checkbox').forEach(function(cb) {
    cb.addEventListener('change', function() {
      if (!pdState) return;
      const ing = this.dataset.ing;
      if (this.checked) pdState.removed.delete(ing);
      else pdState.removed.add(ing);
    });
  });

  root.querySelector('#pd-qty-dec')?.addEventListener('click', function() {
    if (!pdState || pdState.qty <= 1) return;
    pdState.qty--;
    renderProductDetail();
  });
  root.querySelector('#pd-qty-inc')?.addEventListener('click', function() {
    if (!pdState) return;
    pdState.qty++;
    renderProductDetail();
  });

  root.querySelectorAll('.pd-addon-row__btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (!pdState) return;
      const id = this.dataset.id;
      const current = pdState.added[id] || 0;
      if (this.dataset.action === 'inc') pdState.added[id] = current + 1;
      else pdState.added[id] = Math.max(0, current - 1);
      renderProductDetail();
    });
  });

  root.querySelectorAll('input[name="pd-drink"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (!pdState) return;
      pdState.drink = this.value;
      renderProductDetail();
    });
  });

  root.querySelector('#pd-add-btn')?.addEventListener('click', function() {
    if (!pdState) return;
    const addedList = Object.keys(pdState.added)
      .filter(function(id) { return pdState.added[id] > 0; })
      .map(function(id) {
        const ing = getDrinkByKey(id);
        return { id: id, name: ing ? (ing.baseName || ing.name) : id, price: ing ? ing.price : 0, qty: pdState.added[id] };
      });
    let comboDrink = null;
    if (pdState.drink) {
      const opt = getDrinkByKey(pdState.drink);
      if (opt) comboDrink = { id: opt.key, name: opt.baseName || opt.name };
    }
    addToCart(pdState.key, pdState.qty, Array.from(pdState.removed), addedList, comboDrink);
    closeProductDetail();
  });
}

/* ── Filtro unificado ─────────────────────────────────────── */
function applyFilters() {
  const q     = _searchQuery.toLowerCase();
  const cards = document.querySelectorAll('#products-grid .grid-card');
  let visible = 0;
  cards.forEach(card => {
    const categoryMatch = activeCategory === 'todos' || card.dataset.category === activeCategory;
    const name        = card.querySelector('.grid-card__name')?.textContent.toLowerCase() ?? '';
    const searchMatch = q.length === 0 || name.includes(q);
    const show = categoryMatch && searchMatch;
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
  const total = n ?? browsableCatalog().length;
  const cat   = CATEGORIES.find(c => c.id === activeCategory);
  el.textContent = activeCategory === 'todos'
    ? `${total} produto${total!==1?'s':''}`
    : `${total} produto${total!==1?'s':''} em ${cat?.label}`;
}

/* ═══════════════════════════════════════════════════════════
   CARRINHO — completo
   ═══════════════════════════════════════════════════════════ */

// Número WhatsApp do dono da taberna (DDI+DDD+número, só dígitos)
const WHATSAPP_OWNER = "5543998102357";

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

function addToCart(key, qty, removed, added, comboDrink) {
  qty = qty || 1;
  removed = removed || [];
  added = added || [];
  const drink = getDrinkByKey(key);
  if (!drink) return;
  // Combo sem sabor escolhido (ex.: clicou direto em "Comprar" no card, sem
  // abrir a tela de detalhe) — escolhe automaticamente o primeiro sabor do
  // tamanho certo, pra sempre sair um pedido com refrigerante definido.
  if (!comboDrink && drink.category === 'COMBOS' && drink.ml) {
    const fallback = DRINKS.find(function(p) { return p.table === 'BEBIDAS' && p.ml === drink.ml; });
    if (fallback) comboDrink = { id: fallback.key, name: fallback.baseName || fallback.name };
  }
  const remPart = removed.length ? 'rem:' + removed.slice().sort().join('|') : '';
  const addPart = added.length ? 'add:' + added.map(function(a){ return a.id+'x'+a.qty; }).sort().join('|') : '';
  const drkPart = comboDrink ? 'drk:' + comboDrink.id : '';
  const extra   = [remPart, addPart, drkPart].filter(Boolean).join('::');
  const cartKey = extra ? key + '::' + extra : key;
  if (cart[cartKey]) cart[cartKey].qty += qty;
  else cart[cartKey] = { drink, qty:qty, removed: removed.slice(), added: added.slice(), comboDrink: comboDrink || null };
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

// Preço unitário efetivo do item do carrinho: preço base + soma dos
// ingredientes extras adicionados (cada extra é cobrado por unidade do lanche).
function cartUnitPrice(obj) {
  const base = obj.drink.salePrice || obj.drink.price;
  const addedTotal = (obj.added || []).reduce(function(s, a) { return s + a.price * a.qty; }, 0);
  return base + addedTotal;
}

function cartItemLabel(obj) {
  let label = obj.drink.name;
  if (obj.removed && obj.removed.length) label += ' (sem ' + obj.removed.join(', ') + ')';
  if (obj.added && obj.added.length) {
    label += ' (+ ' + obj.added.map(function(a){ return a.qty > 1 ? a.qty+'x '+a.name : a.name; }).join(', ') + ')';
  }
  if (obj.comboDrink) label += ' (Refrigerante: ' + obj.comboDrink.name + ')';
  return label;
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
  const items    = Object.keys(cart).map(function(k) {
    return Object.assign({ cartKey: k }, cart[k]);
  });
  const subtotal = items.reduce(function(s, obj) {
    return s + cartUnitPrice(obj) * obj.qty;
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
  const price = cartUnitPrice(obj);
  const removedNote = obj.removed && obj.removed.length
    ? `<p class="cart-item__note">Sem: ${obj.removed.join(', ')}</p>` : '';
  const addedNote = obj.added && obj.added.length
    ? `<p class="cart-item__note">+ ${obj.added.map(function(a){ return a.qty > 1 ? a.qty+'x '+a.name : a.name; }).join(', ')}</p>` : '';
  const drinkNote = obj.comboDrink
    ? `<p class="cart-item__note">Refrigerante: ${obj.comboDrink.name}</p>` : '';
  return `
    <div class="cart-item" data-key="${obj.cartKey}">
      <img class="cart-item__img" src="${d.img}" alt="${d.name}" width="60" height="80"
           onerror="this.onerror=null;this.src='/src/img/default-produto.svg'"/>
      <div class="cart-item__info">
        <p class="cart-item__name">${d.name}</p>
        ${removedNote}
        ${addedNote}
        ${drinkNote}
        <p class="cart-item__price">${toBRL(price * qty)}</p>
        <p class="cart-item__unit">Un.: ${toBRL(price)}</p>
      </div>
      <div class="cart-item__qty">
        <button data-action="dec" data-key="${obj.cartKey}" aria-label="Diminuir">−</button>
        <span>${qty}</span>
        <button data-action="inc" data-key="${obj.cartKey}" aria-label="Aumentar">+</button>
      </div>
      <button class="cart-item__remove" data-action="remove" data-key="${obj.cartKey}" aria-label="Remover">✕</button>
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
      return { id:obj.drink.id, table_name:obj.drink.table, name:cartItemLabel(obj),
               price:cartUnitPrice(obj), qty:obj.qty };
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
    return obj.qty + 'x ' + cartItemLabel(obj) + ' – ' + toBRL(cartUnitPrice(obj)*obj.qty);
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
  const items = browsableCatalog().filter(d => favorites.has(d.key));
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
      renderTopbarAvatar();
      renderHomeGreeting();
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
      renderTopbarAvatar();
      renderHomeGreeting();
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
    renderTopbarAvatar();
    renderHomeGreeting();
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
      renderTopbarAvatar();
      renderHomeGreeting();
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
  initBottomBar();
  ensurePDOverlay();
  renderTopbarAvatar();
  renderHomeGreeting();
  document.getElementById('topbar-avatar')?.addEventListener('click', function() {
    document.querySelector('.botonBar .list[data-target="perfil"]')?.click();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeProductDetail();
  });
  await loadCatalog();       // carrega produtos do banco → renderCategories + renderGrid + renderCarousel
  initSwiper();               // só inicializa o carrossel depois que os slides reais existem no DOM
  initDealTimer();
  if (Auth.isLoggedIn()) syncFavoritesFromServer();
});
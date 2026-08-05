<?php
// ═══════════════════════════════════════════════════════════
//  index.php — Cache Busting automático por filemtime()
//  Gera ?v=HASH a partir da data de modificação de cada
//  arquivo local. Troca o hash sozinho ao fazer upload.
// ═══════════════════════════════════════════════════════════

// Raiz do site (onde ficam src/style, src/script, etc.)
define('ROOT', __DIR__);

/**
 * Retorna o caminho com ?v=<hash> baseado no filemtime do arquivo.
 * Se o arquivo não existir no servidor ainda, usa a data atual.
 */
function v($path) {
    $file = ROOT . $path;
    $ts   = file_exists($file) ? filemtime($file) : time();
    return $path . '?v=' . substr(md5($ts), 0, 8);
}
?>
<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Taberna - Bebidas Premium" />
    <title>Taberna - Bebidas Premium</title>

    <!-- Fontes externas (sem cache busting — CDN gerencia) -->
    <link
      href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;500&family=Playfair+Display:wght@700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
    />

    <!-- CSS locais — hash automático -->
    <link rel="stylesheet" href="<?= v('/src/style/style.css') ?>" />
    <link rel="stylesheet" href="<?= v('/src/style/profile-extra.css') ?>" />
  </head>
  <body>
    <div id="app">
      <!-- ══════════════════ HEADER ══════════════════ -->
      <header class="topBar">
        <div class="topBar__logo">Taberna</div>
        <div class="search-container">
          <input
            type="text"
            id="search-input"
            placeholder="Buscar produto..."
            autocomplete="off"
          />
          <svg
            class="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M21 21L16.5 16.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              cx="10"
              cy="10"
              r="7"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
        <button class="topBar__hamburger" aria-label="Menu">☰</button>
      </header>

      <!-- ══════════════════ TELAS ══════════════════ -->
      <main id="screens">
        <!-- ▸ HOME -->
        <section class="screen active" data-screen="home" aria-label="Home">
          <section class="products-carousel" aria-label="Produtos em Destaque">
            <div class="swiper-container">
              <div class="swiper-wrapper">
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="1">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Coca+Cola+2L"
                        alt="Coca Cola 2L"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Coca Cola 2L</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 5 estrelas">★★★★★</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 12,99</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="2">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Guaraná+2L"
                        alt="Guaraná 2L"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Guaraná 2L</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 4 estrelas">★★★★☆</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 10,50</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="3">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Cerveja+Premium"
                        alt="Cerveja Premium"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Cerveja Premium</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 5 estrelas">★★★★★</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 18,00</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="4">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Vinho+Tinto"
                        alt="Vinho Tinto"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Vinho Tinto</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 5 estrelas">★★★★★</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 75,00</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="5">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Água+Mineral"
                        alt="Água Mineral"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Água Mineral</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 4 estrelas">★★★★☆</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 3,50</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
                <div class="swiper-slide">
                  <article class="product-card" data-product-id="6">
                    <div class="product-card__image">
                      <img
                        src="https://via.placeholder.com/200x320/2a2a2a/ffffff?text=Whisky"
                        alt="Whisky"
                        loading="lazy"
                        width="200"
                        height="320"
                      />
                    </div>
                    <div class="product-card__info">
                      <h2 class="product-card__name">Whisky</h2>
                      <div class="product-card__rating" aria-label="Avaliação: 5 estrelas">★★★★★</div>
                    </div>
                    <div class="product-card__footer">
                      <span class="product-card__price">R$ 120,00</span>
                      <button class="product-card__button">Comprar</button>
                    </div>
                  </article>
                </div>
              </div>
              <div class="swiper-button-prev" aria-label="Produto anterior"></div>
              <div class="swiper-button-next" aria-label="Próximo produto"></div>
              <div class="swiper-pagination"></div>
            </div>
          </section>

          <section class="brand-filter" aria-label="Filtrar por marca">
            <div class="brand-filter__track" id="brand-track"></div>
          </section>

          <section class="products-grid" aria-label="Catálogo de Bebidas">
            <h2 class="products-grid__title">Catálogo</h2>
            <div class="products-grid__container" id="products-grid"></div>
          </section>
        </section>

        <!-- ▸ PERFIL -->
        <section class="screen" data-screen="perfil" aria-label="Perfil"></section>

        <!-- ▸ FAVORITOS -->
        <section class="screen" data-screen="favoritos" aria-label="Favoritos">
          <div class="page-wrapper">
            <h2 class="page-title">Favoritos</h2>
            <div id="favorites-grid" class="products-grid__container"></div>
            <div id="favorites-empty" class="empty-state" style="display: none">
              <span class="empty-state__icon">☆</span>
              <p class="empty-state__text">Nenhum favorito ainda.</p>
              <p class="empty-state__sub">Toque no ★ de qualquer produto para salvar aqui.</p>
            </div>
          </div>
        </section>

        <!-- ▸ CARRINHO — renderizado dinamicamente pelo JS -->
        <section class="screen" data-screen="carrinho" aria-label="Carrinho"></section>

        <!-- ▸ DESCONTOS -->
        <section class="screen" data-screen="descontos" aria-label="Descontos">
          <div class="page-wrapper">
            <div class="deal-banner">
              <p class="deal-banner__eyebrow">Oferta relâmpago</p>
              <h2 class="deal-banner__title">Até 40% OFF</h2>
              <p class="deal-banner__sub">Válido enquanto durar o estoque</p>
              <div class="deal-banner__timer" id="deal-timer">
                <div class="timer-block"><span id="t-h">00</span><small>hrs</small></div>
                <div class="timer-sep">:</div>
                <div class="timer-block"><span id="t-m">00</span><small>min</small></div>
                <div class="timer-sep">:</div>
                <div class="timer-block"><span id="t-s">00</span><small>seg</small></div>
              </div>
            </div>
            <h3 class="section-subtitle">Promoções do dia</h3>
            <section class="deal-cat-filter" aria-label="Filtrar ofertas por categoria">
              <div class="deal-cat-filter__track" id="deal-cat-track"></div>
            </section>
            <div id="deals-grid" class="products-grid__container"></div>
          </div>
        </section>
      </main>

      <!-- ══════════════════ BOTTOM BAR ══════════════════ -->
      <div class="btbar">
        <nav class="botonBar" aria-label="Navegação principal">
          <ul>
            <li class="list" data-target="perfil">
              <a href="#" aria-label="Perfil">
                <span class="icon"><ion-icon name="person-circle-outline"></ion-icon></span>
                <span class="text">Perfil</span>
              </a>
            </li>
            <li class="list" data-target="favoritos">
              <a href="#" aria-label="Favoritos">
                <span class="icon"><ion-icon name="star-outline"></ion-icon></span>
                <span class="text">Favoritos</span>
              </a>
            </li>
            <li class="list active" data-target="home">
              <a href="#" aria-label="Home">
                <span class="icon"><ion-icon name="home-outline"></ion-icon></span>
                <span class="text">Home</span>
              </a>
            </li>
            <li class="list" data-target="carrinho">
              <a href="#" aria-label="Carrinho">
                <span class="icon">
                  <ion-icon name="bag-outline"></ion-icon>
                  <span class="cart-badge" id="cart-badge" style="display: none">0</span>
                </span>
                <span class="text">Carrinho</span>
              </a>
            </li>
            <li class="list" data-target="descontos">
              <a href="#" aria-label="Descontos">
                <span class="icon"><ion-icon name="flame-outline"></ion-icon></span>
                <span class="text">Descontos</span>
              </a>
            </li>
            <div class="indicator"></div>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Scripts externos (CDN gerencia o cache deles) -->
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

    <!-- Scripts locais — hash automático -->
    <script src="<?= v('/src/script/nscript.js') ?>"></script>

    <script type="module"   src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule        src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
  </body>
</html>
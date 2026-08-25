-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Tempo de geração: 25/08/2026 às 20:15
-- Versão do servidor: 11.8.8-MariaDB-log
-- Versão do PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `u335373403_RockB`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `ACOMPANHAMENTOS`
--

CREATE TABLE `ACOMPANHAMENTOS` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ml` int(11) DEFAULT NULL COMMENT 'peso aproximado em gramas',
  `preco` decimal(10,2) DEFAULT NULL,
  `promocao` tinyint(1) DEFAULT 0,
  `valor_promocional` decimal(10,2) DEFAULT 0.00,
  `promocao_expira_em` datetime DEFAULT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `retornavel` tinyint(1) DEFAULT 0 COMMENT 'reaproveitado como: vegetariano?',
  `img` varchar(255) DEFAULT NULL,
  `rate` decimal(3,2) DEFAULT NULL,
  `preco_de_compra` decimal(10,2) DEFAULT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `ACOMPANHAMENTOS`
--

INSERT INTO `ACOMPANHAMENTOS` (`id`, `nome`, `descricao`, `ml`, `preco`, `promocao`, `valor_promocional`, `promocao_expira_em`, `marca`, `retornavel`, `img`, `rate`, `preco_de_compra`, `estoque`) VALUES
(200, 'Batata Frita (P)', 'Porção individual de batatas fritas crocantes.', 150, 12.00, 0, 0.00, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.60, 4.00, 60),
(201, 'Batata Frita (G)', 'Porção grande de batatas fritas crocantes, ideal para dividir.', 300, 18.00, 0, 0.00, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.70, 7.00, 50),
(202, 'Batata Rústica', 'Batatas com casca temperadas com ervas.', 250, 16.90, 0, 0.00, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.60, 6.50, 40),
(203, 'Onion Rings', 'Anéis de cebola empanados e fritos, crocantes por fora.', 180, 16.50, 1, 13.90, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.80, 6.00, 40),
(204, 'Nuggets (10un)', '10 unidades de nuggets de frango crocantes.', 200, 19.90, 0, 0.00, NULL, 'Rock Burger', 0, 'acompanhamento.png', 4.50, 8.00, 40),
(205, 'Polenta Frita', 'Palitos de polenta fritos, crocantes por fora e macios por dentro.', 200, 14.90, 0, 0.00, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.40, 5.50, 35),
(206, 'Salada Caesar', 'Alface, croutons, parmesão e molho caesar.', 220, 18.90, 0, 0.00, NULL, 'Rock Burger', 1, 'acompanhamento.png', 4.50, 8.00, 25);

-- --------------------------------------------------------

--
-- Estrutura para tabela `addresses`
--

CREATE TABLE `addresses` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) UNSIGNED NOT NULL,
  `label` varchar(60) NOT NULL DEFAULT 'Casa',
  `street` varchar(200) NOT NULL,
  `number` varchar(20) NOT NULL,
  `complement` varchar(100) DEFAULT NULL,
  `district` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` char(2) NOT NULL,
  `zip` varchar(10) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `BEBIDAS`
--

CREATE TABLE `BEBIDAS` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ml` int(11) DEFAULT NULL,
  `preco` decimal(10,2) DEFAULT NULL,
  `promocao` tinyint(1) DEFAULT 0,
  `valor_promocional` decimal(10,2) DEFAULT 0.00,
  `promocao_expira_em` datetime DEFAULT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `retornavel` tinyint(1) DEFAULT 0,
  `img` varchar(255) DEFAULT NULL,
  `rate` decimal(3,2) DEFAULT NULL,
  `preco_de_compra` decimal(10,2) DEFAULT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `BEBIDAS`
--

INSERT INTO `BEBIDAS` (`id`, `nome`, `descricao`, `ml`, `preco`, `promocao`, `valor_promocional`, `promocao_expira_em`, `marca`, `retornavel`, `img`, `rate`, `preco_de_compra`, `estoque`) VALUES
(300, 'Coca-Cola', 'Lata 350ml gelada.', 350, 8.00, 0, 0.00, NULL, 'Coca-Cola', 0, 'lata.png', 4.70, 3.00, 80),
(301, 'Guaraná Antarctica', 'Lata 350ml gelada.', 350, 7.50, 0, 0.00, NULL, 'Antarctica', 0, 'lata.png', 4.60, 2.80, 80),
(302, 'Suco de Laranja', 'Suco natural de laranja, 300ml.', 300, 9.00, 0, 0.00, NULL, 'Rock Burger', 0, 'bebida.png', 4.60, 3.50, 40),
(303, 'Milkshake Chocolate', 'Milkshake cremoso de chocolate, 400ml.', 400, 15.00, 1, 12.90, NULL, 'Rock Burger', 0, 'bebida.png', 4.90, 6.00, 30),
(304, 'Milkshake Morango', 'Milkshake cremoso de morango, 400ml.', 400, 15.00, 0, 0.00, NULL, 'Rock Burger', 0, 'bebida.png', 4.80, 6.00, 30),
(305, 'Água Mineral', 'Água mineral sem gás, 500ml.', 500, 4.00, 0, 0.00, NULL, 'Rock Burger', 1, 'garrafa-refrigerante.png', 4.50, 1.20, 100),
(306, 'Água com Gás', 'Água mineral com gás, 500ml.', 500, 4.50, 0, 0.00, NULL, 'Rock Burger', 1, 'garrafa-refrigerante.png', 4.40, 1.40, 100),
(307, 'Suco de Uva', 'Suco natural de uva, 300ml.', 300, 9.00, 0, 0.00, NULL, 'Rock Burger', 0, 'bebida.png', 4.50, 3.50, 40),
(308, 'Sprite', 'Lata 350ml gelada.', 350, 7.00, 0, 0.00, NULL, 'Sprite', 0, 'lata.png', 4.00, 2.60, 60),
(309, 'Cerveja Long Neck', 'Long neck gelada, 355ml.', 355, 9.90, 0, 0.00, NULL, 'Heineken', 0, 'garrafa-cerveja.png', 4.80, 5.00, 60),
(310, 'Chá Gelado', 'Chá gelado sabor limão, 300ml.', 300, 7.50, 0, 0.00, NULL, 'Rock Burger', 0, 'lata.png', 4.30, 3.00, 40);

-- --------------------------------------------------------

--
-- Estrutura para tabela `COMBOS`
--

CREATE TABLE `COMBOS` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ml` int(11) DEFAULT NULL COMMENT 'peso aproximado total em gramas',
  `preco` decimal(10,2) DEFAULT NULL,
  `promocao` tinyint(1) DEFAULT 0,
  `valor_promocional` decimal(10,2) DEFAULT 0.00,
  `promocao_expira_em` datetime DEFAULT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `retornavel` tinyint(1) DEFAULT 0 COMMENT 'reaproveitado como: vegetariano?',
  `img` varchar(255) DEFAULT NULL,
  `rate` decimal(3,2) DEFAULT NULL,
  `preco_de_compra` decimal(10,2) DEFAULT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `COMBOS`
--

INSERT INTO `COMBOS` (`id`, `nome`, `descricao`, `ml`, `preco`, `promocao`, `valor_promocional`, `promocao_expira_em`, `marca`, `retornavel`, `img`, `rate`, `preco_de_compra`, `estoque`) VALUES
(100, 'Combo Clássico', 'X-Burger + batata frita média + refrigerante lata.', 600, 29.90, 0, 0.00, NULL, 'Rock Burger', 0, 'combo.png', 4.70, 14.00, 40),
(101, 'Combo Duplo', 'X-Tudo + batata frita média + refrigerante lata.', 750, 42.90, 1, 37.90, NULL, 'Rock Burger', 0, 'combo.png', 4.80, 20.00, 30),
(102, 'Combo Família', '4 lanches à sua escolha + 2 batatas grandes + 4 refrigerantes.', 1800, 99.90, 0, 0.00, NULL, 'Rock Burger', 0, 'combo.png', 4.90, 48.00, 15),
(103, 'Combo Kids', 'Mini lanche + batata pequena + suco.', 400, 24.90, 0, 0.00, NULL, 'Rock Burger', 0, 'combo.png', 4.50, 11.00, 30),
(104, 'Combo Vegetariano', 'Veggie Burger + batata frita + suco natural.', 550, 33.90, 0, 0.00, NULL, 'Rock Burger', 1, 'combo.png', 4.40, 15.00, 20),
(105, 'Combo Rock Burger', 'Rock Burger Especial + onion rings + milkshake.', 700, 49.90, 1, 44.90, NULL, 'Rock Burger', 0, 'combo.png', 5.00, 22.00, 20);

-- --------------------------------------------------------

--
-- Estrutura para tabela `coupons`
--

CREATE TABLE `coupons` (
  `id` int(11) UNSIGNED NOT NULL,
  `code` varchar(30) NOT NULL,
  `type` enum('percent','fixed') NOT NULL DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL,
  `min_order` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_uses` int(11) NOT NULL DEFAULT 0,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `coupons`
--

INSERT INTO `coupons` (`id`, `code`, `type`, `value`, `min_order`, `max_uses`, `used_count`, `active`, `expires_at`, `created_at`) VALUES
(1, 'TABERNA10', 'percent', 10.00, 30.00, 0, 0, 1, NULL, '2026-06-09 05:45:51'),
(2, 'TABERNA20', 'percent', 20.00, 80.00, 0, 0, 1, NULL, '2026-06-09 05:45:51'),
(3, 'PROMO5', 'fixed', 5.00, 20.00, 100, 0, 1, NULL, '2026-06-09 05:45:51');

-- --------------------------------------------------------

--
-- Estrutura para tabela `expenses`
--

CREATE TABLE `expenses` (
  `id` int(10) UNSIGNED NOT NULL,
  `description` varchar(200) NOT NULL,
  `category` varchar(80) NOT NULL DEFAULT 'Geral',
  `amount` decimal(10,2) NOT NULL,
  `expense_date` date NOT NULL,
  `staff_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `expenses`
--

INSERT INTO `expenses` (`id`, `description`, `category`, `amount`, `expense_date`, `staff_id`, `created_at`) VALUES
(1, 'Salarios', 'Funcionários', 4920.00, '2026-06-10', 2, '2026-06-10 19:43:02'),
(2, 'Aluguel', 'Aluguel', 680.00, '2026-06-10', 2, '2026-06-10 19:43:21'),
(3, 'Agua e luz', 'Energia', 500.00, '2026-06-10', 2, '2026-06-10 19:43:42');

-- --------------------------------------------------------

--
-- Estrutura para tabela `favorites`
--

CREATE TABLE `favorites` (
  `user_id` int(11) UNSIGNED NOT NULL,
  `product_key` varchar(50) NOT NULL,
  `added_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `INGREDIENTES`
--

CREATE TABLE `INGREDIENTES` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ml` int(11) DEFAULT NULL COMMENT 'peso aproximado em gramas',
  `preco` decimal(10,2) DEFAULT NULL,
  `promocao` tinyint(1) DEFAULT 0,
  `valor_promocional` decimal(10,2) DEFAULT 0.00,
  `promocao_expira_em` datetime DEFAULT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `retornavel` tinyint(1) DEFAULT 0 COMMENT 'reaproveitado como: vegetariano?',
  `img` varchar(255) DEFAULT NULL,
  `rate` decimal(3,2) DEFAULT NULL,
  `preco_de_compra` decimal(10,2) DEFAULT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `INGREDIENTES`
--

INSERT INTO `INGREDIENTES` (`id`, `nome`, `descricao`, `ml`, `preco`, `promocao`, `valor_promocional`, `promocao_expira_em`, `marca`, `retornavel`, `img`, `rate`, `preco_de_compra`, `estoque`) VALUES
(400, 'Bacon Extra', 'Porção extra de bacon crocante.', 30, 5.00, 0, 0.00, NULL, 'Rock Burger', 0, 'ingrediente.png', 4.80, 2.00, 100),
(401, 'Queijo Cheddar Extra', 'Fatia extra de queijo cheddar.', 20, 4.00, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.70, 1.50, 100),
(402, 'Ovo Frito', 'Ovo frito adicional.', 50, 3.50, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.60, 1.20, 100),
(403, 'Cebola Caramelizada', 'Porção de cebola caramelizada.', 30, 3.00, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.50, 1.00, 100),
(404, 'Molho Especial da Casa', 'Molho exclusivo da Rock Burger.', 20, 2.50, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.70, 0.80, 100),
(405, 'Picles', 'Fatias de picles em conserva.', 15, 2.00, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.20, 0.60, 100),
(406, 'Alface e Tomate Extra', 'Porção extra de alface e tomate.', 30, 2.00, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.30, 0.70, 100),
(407, 'Maionese Temperada', 'Maionese caseira temperada.', 15, 2.00, 0, 0.00, NULL, 'Rock Burger', 1, 'ingrediente.png', 4.40, 0.60, 100);

-- --------------------------------------------------------

--
-- Estrutura para tabela `LANCHES`
--

CREATE TABLE `LANCHES` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ml` int(11) DEFAULT NULL COMMENT 'peso aproximado em gramas',
  `preco` decimal(10,2) DEFAULT NULL,
  `promocao` tinyint(1) DEFAULT 0,
  `valor_promocional` decimal(10,2) DEFAULT 0.00,
  `promocao_expira_em` datetime DEFAULT NULL,
  `marca` varchar(50) DEFAULT NULL,
  `retornavel` tinyint(1) DEFAULT 0 COMMENT 'reaproveitado como: vegetariano?',
  `img` varchar(255) DEFAULT NULL,
  `rate` decimal(3,2) DEFAULT NULL,
  `preco_de_compra` decimal(10,2) DEFAULT NULL,
  `estoque` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `orders`
--

CREATE TABLE `orders` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) UNSIGNED NOT NULL,
  `status` enum('pendente','confirmado','em_preparo','em_entrega','entregue','cancelado') NOT NULL DEFAULT 'pendente',
  `subtotal` decimal(10,2) NOT NULL,
  `freight` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `address_id` int(11) UNSIGNED DEFAULT NULL,
  `guest_name` varchar(120) DEFAULT NULL,
  `guest_phone` varchar(20) DEFAULT NULL,
  `payment_method` enum('dinheiro','pix','cartao_credito','cartao_debito') NOT NULL DEFAULT 'pix',
  `coupon_code` varchar(30) DEFAULT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `address_text` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) UNSIGNED NOT NULL,
  `order_id` int(11) UNSIGNED NOT NULL,
  `product_id` int(11) UNSIGNED NOT NULL,
  `table_name` varchar(30) NOT NULL DEFAULT 'LANCHES',
  `product_name` varchar(200) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `qty` smallint(6) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pricing_config`
--

CREATE TABLE `pricing_config` (
  `key` varchar(60) NOT NULL,
  `value` varchar(200) NOT NULL DEFAULT '',
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `pricing_config`
--

INSERT INTO `pricing_config` (`key`, `value`, `updated_at`) VALUES
('machine_pct', '0', '2026-06-10 19:41:23'),
('margin_pct', '10', '2026-06-10 19:49:11'),
('monthly_revenue', '20000', '2026-06-10 19:47:43'),
('monthly_units', '540', '2026-06-10 19:47:43'),
('tax_pct', '0', '2026-06-10 19:41:23');

-- --------------------------------------------------------

--
-- Estrutura para tabela `pricing_costs`
--

CREATE TABLE `pricing_costs` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `type` enum('fixo','variavel','reinvestimento') NOT NULL,
  `value_type` enum('reais','percent') NOT NULL DEFAULT 'reais',
  `value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `pricing_costs`
--

INSERT INTO `pricing_costs` (`id`, `name`, `type`, `value_type`, `value`, `active`, `created_at`, `updated_at`) VALUES
(1, 'Aluguel', 'fixo', 'reais', 680.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:47:51'),
(2, 'Energia', 'fixo', 'reais', 400.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:47:59'),
(3, 'Internet', 'fixo', 'reais', 100.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:48:03'),
(4, 'Funcionários', 'fixo', 'reais', 4920.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:48:10'),
(5, 'Maquininha', 'variavel', 'percent', 1.50, 1, '2026-06-10 19:41:23', '2026-06-10 19:48:17'),
(6, 'Imposto', 'variavel', 'percent', 0.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:41:23'),
(7, 'Reinvestimento', 'reinvestimento', 'percent', 15.00, 1, '2026-06-10 19:41:23', '2026-06-10 19:49:05');

-- --------------------------------------------------------

--
-- Estrutura para tabela `sessions`
--

CREATE TABLE `sessions` (
  `id` int(11) UNSIGNED NOT NULL,
  `user_id` int(11) UNSIGNED NOT NULL,
  `token` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `staff`
--

CREATE TABLE `staff` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','funcionario') NOT NULL DEFAULT 'funcionario',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `staff`
--

INSERT INTO `staff` (`id`, `name`, `email`, `password_hash`, `role`, `active`, `created_at`) VALUES
(1, 'Administrador', 'admin@taberna.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 0, '2026-06-10 07:16:19'),
(2, 'Careca', 'tatuimpe@gmail.com', '$2y$10$S/ETbY1K1q8BQ49cUkIpK.pFjWbdoZemQ.0krOYyZZXwzlHL4RzlS', 'admin', 1, '2026-06-10 07:26:05');

-- --------------------------------------------------------

--
-- Estrutura para tabela `staff_sessions`
--

CREATE TABLE `staff_sessions` (
  `id` int(10) UNSIGNED NOT NULL,
  `staff_id` int(10) UNSIGNED NOT NULL,
  `token` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `staff_sessions`
--

INSERT INTO `staff_sessions` (`id`, `staff_id`, `token`, `expires_at`, `created_at`) VALUES
(1, 1, '1c5b7be33a4580768bba42005f8bae306245c3cf8858cbf61457a91f6c649f92', '2026-06-10 19:24:57', '2026-06-10 07:24:57'),
(2, 2, '30f9fc85933ce3e0e5d7e31692c8c3c3097894a066493bf322a5d0b135d7d82e', '2026-06-11 07:42:05', '2026-06-10 19:42:05'),
(3, 2, '80559efc86065b9729e60cbf39bea92feaa40432a6b0b7f6640ccf947dd2e003', '2026-06-20 08:23:58', '2026-06-19 20:23:58'),
(4, 2, '14f0947c8517b7178a0277d8b6060508dec343869188a7f8a6db1e0664dd4097', '2026-06-24 15:34:45', '2026-06-24 03:34:45');

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `badge` varchar(60) DEFAULT 'Cliente Bronze',
  `points` int(11) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Acionadores `users`
--
DELIMITER $$
CREATE TRIGGER `trg_badge_after_update` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
  DECLARE nb VARCHAR(60);
  IF NEW.points >= 5000 THEN SET nb = 'Cliente Diamante';
  ELSEIF NEW.points >= 2000 THEN SET nb = 'Cliente Platina';
  ELSEIF NEW.points >= 840  THEN SET nb = 'Cliente Ouro';
  ELSEIF NEW.points >= 300  THEN SET nb = 'Cliente Prata';
  ELSE SET nb = 'Cliente Bronze';
  END IF;
  IF NEW.badge != nb THEN
    UPDATE `users` SET badge = nb WHERE id = NEW.id;
  END IF;
END
$$
DELIMITER ;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `ACOMPANHAMENTOS`
--
ALTER TABLE `ACOMPANHAMENTOS`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_addresses_user` (`user_id`);

--
-- Índices de tabela `BEBIDAS`
--
ALTER TABLE `BEBIDAS`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `COMBOS`
--
ALTER TABLE `COMBOS`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `coupons`
--
ALTER TABLE `coupons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_coupons_code` (`code`);

--
-- Índices de tabela `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expenses_date` (`expense_date`);

--
-- Índices de tabela `favorites`
--
ALTER TABLE `favorites`
  ADD PRIMARY KEY (`user_id`,`product_key`);

--
-- Índices de tabela `INGREDIENTES`
--
ALTER TABLE `INGREDIENTES`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `LANCHES`
--
ALTER TABLE `LANCHES`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user` (`user_id`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `fk_orders_addr` (`address_id`);

--
-- Índices de tabela `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order` (`order_id`);

--
-- Índices de tabela `pricing_config`
--
ALTER TABLE `pricing_config`
  ADD PRIMARY KEY (`key`);

--
-- Índices de tabela `pricing_costs`
--
ALTER TABLE `pricing_costs`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sessions_token` (`token`),
  ADD KEY `idx_sessions_user` (`user_id`);

--
-- Índices de tabela `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_staff_email` (`email`);

--
-- Índices de tabela `staff_sessions`
--
ALTER TABLE `staff_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_staff_token` (`token`),
  ADD KEY `fk_staff_sessions` (`staff_id`);

--
-- Índices de tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `ACOMPANHAMENTOS`
--
ALTER TABLE `ACOMPANHAMENTOS`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=207;

--
-- AUTO_INCREMENT de tabela `addresses`
--
ALTER TABLE `addresses`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `BEBIDAS`
--
ALTER TABLE `BEBIDAS`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=311;

--
-- AUTO_INCREMENT de tabela `COMBOS`
--
ALTER TABLE `COMBOS`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT de tabela `coupons`
--
ALTER TABLE `coupons`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `INGREDIENTES`
--
ALTER TABLE `INGREDIENTES`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=408;

--
-- AUTO_INCREMENT de tabela `LANCHES`
--
ALTER TABLE `LANCHES`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pricing_costs`
--
ALTER TABLE `pricing_costs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `staff_sessions`
--
ALTER TABLE `staff_sessions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `favorites`
--
ALTER TABLE `favorites`
  ADD CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_addr` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `staff_sessions`
--
ALTER TABLE `staff_sessions`
  ADD CONSTRAINT `fk_staff_sessions` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Tempo de geração: 27/08/2026 às 19:27
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
-- Estrutura para tabela `LANCHES`
--

CREATE TABLE `LANCHES` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `descricao` varchar(300) DEFAULT NULL,
  `ingredientes` varchar(300) DEFAULT NULL,
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
-- Despejando dados para a tabela `LANCHES`
--

INSERT INTO `LANCHES` (`id`, `nome`, `descricao`, `ingredientes`, `ml`, `preco`, `promocao`, `valor_promocional`, `promocao_expira_em`, `marca`, `retornavel`, `img`, `rate`, `preco_de_compra`, `estoque`) VALUES
(1, 'AC/DC', 'Blend 100% costela bovina (150g) selado na chapa, cheddar fundido, maionese grill e ketchup defumado sobre pão com gergelim tostado.', 'Pão com gergelim tostado, Hamburger(150g) blend 100% costela bovina, Fatias de cheddar fundido, Maionese grill, Ketchup defumado', NULL, 32.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/AcDc.png', 4.70, 0.00, 50),
(2, 'Rammstein', 'Blend 100% costela bovina (150g) selado na chapa, queijo fundido, calabresa em rodelas grelhadas, cream cheese e sweet chilli sobre pão brioche tostado.', 'Pão,Carne,Queijo,Calabresa em rodelas,Cream cheese,Sweet chilli', 220, 37.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/Rammstein.png', 4.70, 0.00, 50),
(3, 'Slipknot', 'Pão, carne, queijo, bacon caramelizado, picles, barbecue, maionese defumada.', 'Pão,Carne,Queijo,Bacon caramelizado,Picles,Barbecue,Maionese defumada', NULL, 36.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/Slipknot.png', 4.70, 0.00, 50),
(4, 'Guns N\' Roses', 'Pão com gergelim, hambúrguer de linguiça, queijo prato, alface, ovo de codorna, cebola roxa.', 'Pão com gergelim,Hambúrguer de linguiça,Queijo prato,Alface,Ovo de codorna,Cebola roxa', NULL, 35.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/GunsRoses.png', 4.70, 0.00, 50),
(5, 'Korn', 'Pão brioche, hambúrguer, queijo prato, alho frito, ketchup defumado.', 'Pão brioche,Hambúrguer,Queijo prato,Alho frito,Ketchup defumado', NULL, 33.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/Korn.png', 4.70, 0.00, 50),
(6, 'Linkin Park', 'Pão sweet home, hambúrguer, queijo prato, alface, tomate, cebola roxa.', 'Pão sweet home,Hambúrguer,Queijo prato,Alface,Tomate,Cebola roxa', NULL, 34.00, 0, 0.00, NULL, 'Rock Burger', 0, 'hamburger/LinkinPark.png', 4.70, 0.00, 50);

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `LANCHES`
--
ALTER TABLE `LANCHES`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `LANCHES`
--
ALTER TABLE `LANCHES`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

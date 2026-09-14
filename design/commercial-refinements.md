# TravelPro — refinamento de apresentação

## Composição

Mantida a direção aprovada, Manrope/DM Sans, identidade e conteúdo. A hero ganhou área própria: em 1440×900 sua altura passou de cerca de 469 para 760 px. O título e a campanha têm mais espaço livre. O cabeçalho acompanha a navegação no desktop, mantendo login e cadastro acessíveis.

A galeria de entregas ocupa a área abaixo do cabeçalho quando entra em cena. Cards de aproximadamente 533 px de largura em 1440 px (antes333 px), peças entre320–340 px, títulos em34 px e descrições em15 px. A apresentação horizontal mostra menos cards por vez para aumentar legibilidade. Em celular, a navegação usa scroll vertical normal e faixa horizontal nativa, com cards de89vw e altura de605 px.

## Animação

GSAP3.14.2/ScrollTrigger: entrada de títulos com máscara, campanha com perspectiva moderada, canais sequenciados, galeria com entrada progressiva e deslocamento horizontal amortecido. O scroll fixa somente a galeria, depois da hero. A navegação não captura a roda do mouse: usa o scroll nativo como controle, além das setas e capítulos. Home/logo retornam ao topo; End avança ao último card. Reduced-motion remove o pin/vídeo e conserva o acesso à galeria. Controle de pausa mantido.

O fundo foi renderizado novamente com HyperFrames0.8.34: 1920×1080, 30fps, 12s, H.264 CRF22, yuv420p, faststart, sem áudio, 2.306.084bytes. Zoom/pan reduzidos. A mesma imagem de1672×941 foi preservada; exportar em1080p não acrescenta detalhes à foto original. Fonte editável em `design/hero-motion/index.html` e vídeo servido em `dist/assets/hero-motion.mp4`.

## Arquivos e verificação

`dist/refinements.css` concentra a nova hierarquia de espaço e tipografia sobre a base comercial. `dist/commercial.js` coordena os dois momentos e a acessibilidade. Autenticação e portal permanecem com os estilos existentes.

Conferidos: desktop1440×900, notebook1366×768 e mobile390×844; largura sem overflow da página; hero e peças; scroll manual; capítulos; último card; vídeo1080p carregado; navegação com movimento reduzido. HyperFrames passou lint, validate e inspect. A composição fonte começa e termina no mesmo enquadramento, comprovado por capturas idênticas; a compressão H.264 pode alterar pixels decodificados.

# TravelPro — landing comercial

Implementação da direção aprovada: resultados da agência, tipografia forte e uma cena contínua. O CTA principal da hero foi removido. Entrar e Começar agora permanecem no cabeçalho; o identificador de público fica junto da marca, com adaptação para a segunda linha em telas estreitas. O subtítulo foi preservado.

## Tipografia e identidade

Manrope 800 para títulos, DM Sans para textos. São uma aproximação implementável do peso e desenho da imagem de referência; uma imagem gerada não identifica um arquivo de fonte exato. Fontes via Google Fonts, com fallback sans-serif. Paleta: carvão #171B1D, papel #F4F1E9 e laranja #FF602E. Símbolo original fornecido pelo cliente.

## Movimento

- A composição em `design/hero-motion/index.html` foi criada e renderizada com HyperFrames 0.8.34 + GSAP 3.14.2. Cena de 12 segundos, zoom/pan leves, extremos iguais. O MP4 final em `dist/assets/hero-motion.mp4` usa H.264, yuv420p, faststart, 1280×720, 24 fps, sem áudio, 1.032.144 bytes.
- GSAP e ScrollTrigger 3.14.2 estão em `dist/vendor/`, mantendo seus cabeçalhos de licença. Fontes oficiais: https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js e https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js.
- `dist/commercial.js` coordena títulos, campanha, canais e cards; o scroll avança a faixa horizontal sem trocar toda a tela. Setas, navegação por capítulos e teclado são alternativas.
- Mobile usa rolagem normal e faixa horizontal nativa. Movimento reduzido elimina a cena fixada e o vídeo. Há controle de pausa; vídeo pausa com a aba oculta ou hero fora da tela e evita carregar com economia de dados.
- Foto estática permanece se o vídeo não puder reproduzir. O conteúdo e os acessos continuam disponíveis se a animação não carregar.

## Integração

Novos arquivos `commercial.css` e `commercial.js` evitam alterar estilos compartilhados por autenticação e portal. `backend/app.mjs` ganhou somente o MIME público `video/mp4`. Login, cadastro, API e armazenamento continuam com seus fluxos existentes. Os exemplos de entregas são ilustrativos, indicados na interface; não são indicadores reais de resultado nem execução de IA ou integrações.

## Verificação

Visual e navegação conferidos em desktop 1440×900 e mobile 390×844. Confirmados: vídeo carregado/reproduzindo, pausa/retomada, navegação até o quinto card e retorno, setas no celular, sem overflow da página, modo de movimento reduzido e links de login/cadastro. A composição HyperFrames passou no check de lint, runtime e layout, com verificação adicional de loop e cobertura de quadro. O MP4 é entregue pelo servidor como `video/mp4`.

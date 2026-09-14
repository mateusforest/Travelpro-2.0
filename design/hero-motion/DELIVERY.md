# Fundo TravelPro com movimento perceptível

Arquivo final: **hero-lencois-visible.mp4**.

- H.264, 1920 × 1080, 30 fps, 10 segundos, 300 quadros, sem áudio.
- CRF 23, formato de pixel yuv420p e faststart confirmado. Tamanho: 2.321.639 bytes (2,32 MB).
- Mesma fotografia original: SHA-256 `ec5a875bb9f875e241a6c993cb7fa42c91016411cbd49ec96c94db7e12120a10`, idêntico ao arquivo de origem.
- Zoom de 1,04 a 1,10 e pan horizontal total de 18 px, em ciclo contínuo. O movimento começa já em andamento, chega ao enquadramento mais próximo em 2,5 s, ao mais aberto em 7,5 s e fecha no ponto inicial em 10 s.
- A animação é de enquadramento de uma foto: nenhum movimento real da pessoa foi gerado.

## Verificação

O comando `hyperframes check` passou com zero erros de lint, execução e movimento e zero problemas de layout em nove amostras. Não há texto no vídeo para auditar contraste.

Os quadros do primeiro e do segundo segundo já mostram deslocamento perceptível. Em 1 s, a imagem ganha 33,79 px de largura e sua borda esquerda desloca 28,27 px; em 2 s, a largura ganha 54,72 px. O movimento ao redor da pessoa é menor porque a origem do zoom a preserva no enquadramento.

O primeiro quadro e o estado exato de 10 s são idênticos pixel a pixel. A velocidade também é contínua na emenda. O último quadro codificado é de 9,9667 s e se conecta ao primeiro pelo próximo passo normal de 1/30 s. Todos os enquadramentos mantêm a fotografia cobrindo o vídeo inteiro.

Evidências em `validation/`:

- `verified-motion-contact-sheet.jpg`: comparação visual de 0, 1, 2, 5, 7,5 e 10 s.
- `exact-*.png`: quadros de referência do GSAP, incluindo o limite exato de 10 s.
- `encoded-01.png` a `encoded-05.png`: quadros extraídos do MP4 final em 0, 1, 2, 5 e 9,9667 s.
- `animation-map.json`: estados reais de transformação, limites, diferenças de pixels e confirmação da emenda.
- `media-probe.json` e `media-container.json`: formato do arquivo e confirmação de faststart.

O snapshot padrão do HyperFrames oculta a composição em seu término exato, portanto `frame-05-at-10s.png` e o `contact-sheet.jpg` automático mostram o fim da duração como fundo vazio. Esse quadro não está no MP4. A evidência válida da emenda é `exact-10.000s.png`, obtida buscando diretamente a timeline GSAP; a folha `verified-motion-contact-sheet.jpg` usa essa referência.

## Fonte e reprodução

`index.html`, `gsap.min.js`, `hero-lencois.png`, `hyperframes.json` e `package.json` formam a composição HyperFrames. `DESIGN.md` registra a direção visual. `validate-motion.mjs` reproduz a verificação em navegador local sem interface usando as dependências já instaladas neste workspace.

Para renderizar novamente com HyperFrames 0.8.34 e FFmpeg disponíveis:

```powershell
npx --yes hyperframes@0.8.34 check .
npx --yes hyperframes@0.8.34 render . --output hero-lencois-visible.mp4 --fps 30 --quality high --crf 23 --workers 2 --strict-all
```

A composição está pausada por contrato do HyperFrames. No site, o elemento de vídeo controla o loop e o botão reproduzir/pausar. Nenhum arquivo do site foi alterado nesta entrega de asset.

# TravelPro — hero com movimento contínuo

Atualização de 11 de setembro de 2026.

## Composição

A campanha principal flutua continuamente e duas peças complementares se abrem em camadas. Sinais percorrem as conexões e destacam os canais em sequência. O texto principal permanece estável para leitura.

O fundo utiliza a mesma fotografia em uma composição HyperFrames de 10 segundos, 1920 × 1080, 30 fps, H.264, sem áudio, 2.321.639 bytes. A animação é de enquadramento, não de movimento real do cenário. A fonte fica em `design/hero-motion/`, com instruções de renderização em `DELIVERY.md`.

## Controle de movimento

O botão “Pausar animação” pausa a timeline GSAP e o vídeo sem esconder a imagem, redefinir suas transformações ou voltar ao início. “Retomar animação” continua do ponto atual. A animação também para quando a hero sai de vista ou a aba fica oculta.

A preferência por movimento reduzido inicia a cena parada e oferece “Ativar animação”. A ativação explícita permite o movimento, mantendo o botão de pausa disponível. Se a reprodução automática do vídeo for recusada, a fotografia continua visível e a composição GSAP permanece independente.

## Verificação realizada

- Sintaxe JavaScript válida e página servida pelo backend local.
- Conferência visual em 1440 × 900 e 390 × 844.
- Transformações da campanha e dos cards mudam continuamente sem interação.
- Pausa comparada em duas amostras separadas: tempo do vídeo, transformações dos três cards e posição dos sinais idênticos; vídeo permanece visível.
- Retomada confirmada com avanço do vídeo e das transformações.
- Preferência por movimento reduzido: estado inicial parado e ativação pelo botão confirmados.
- Vídeo integrado reproduz com duração de 10 segundos; composição HyperFrames validada, incluindo continuidade no fechamento do ciclo.
- Nenhum erro ou aviso de console observado na página.

Alterações restritas à landing page e aos arquivos de composição da hero. Portal, autenticação, dados e integrações preservados.

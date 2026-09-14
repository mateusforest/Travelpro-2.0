# Publicação do TravelPro

A versão atual é a landing “Mais leads. Mais alcance. Mais agilidade.”,
em `dist/index.html`. Versione também os estilos, scripts, imagens, vídeo
e as páginas do portal em `dist/`.

## Vercel

O arquivo `vercel.json` seleciona o preset Other, sem compilação, e publica
`dist`. Essa publicação serve a landing e os arquivos das páginas.

O backend não é executado por esse deploy estático. Login, cadastro e
salvamento do portal precisam das rotas `/api/` do servidor Node.js.

## Aplicação completa

O servidor `server.mjs` serve as páginas e a API. Ele exige Node.js 24+
e disco persistente para SQLite, uploads e a chave de criptografia.
Consulte `BACKEND.md` e `.env.example` para a configuração com HTTPS.
Não hospede o banco em armazenamento temporário de funções serverless.

Nunca envie `.env`, `data/`, bancos ou chaves privadas ao GitHub.

import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/experience/index' },
      { source: '/login', destination: '/experience/login' },
      { source: '/cadastro', destination: '/experience/cadastro' },
      { source: '/portal', destination: '/experience/portal' },
      { source: '/:view(index|login|cadastro|portal|agencia|agenda|agente|cliente|clientes|configuracoes|cotacao|documento|documentos|faturamento|financeiro|integracoes|leads|orcamento|orcamentos|plano|roteiro|roteiros|seguranca|studio|travelmatch|viagem|vuei|whatsapp).html', destination: '/experience/:view' },
    ], afterFiles: [], fallback: [] }
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig

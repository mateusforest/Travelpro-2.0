"use client"

import { motion } from "framer-motion"
import { Sparkles, Database, CreditCard, MessageCircle, Mail, Plus, type LucideIcon } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { BackendNotice, MasterPageHeader, PrimaryButton, StatusBadge } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

type Integracao = {
  nome: string
  descricao: string
  icon: LucideIcon
  status: string
}

const integracoes: Integracao[] = [
  { nome: "OpenAI", descricao: "Modelos de IA e geração de texto", icon: Sparkles, status: "Em preparação" },
  { nome: "Supabase", descricao: "Banco de dados e autenticação", icon: Database, status: "Em preparação" },
  { nome: "Stripe", descricao: "Cobrança e assinaturas", icon: CreditCard, status: "Em preparação" },
  { nome: "WhatsApp", descricao: "Mensageria com clientes", icon: MessageCircle, status: "Desconectado" },
  { nome: "E-mail", descricao: "Envio transacional e notificações", icon: Mail, status: "Desconectado" },
]

export default function MasterIntegracoesPage() {
  const { showToast } = useMaster()

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Integrações"
            description="Status global das integracoes do ecossistema COS."
            actions={<PrimaryButton icon={Plus} onClick={() => showToast("Novas integracoes reais ainda nao sao configuradas por esta tela.")}>Nova integracao</PrimaryButton>}
          />

          <div className="mb-8">
            <BackendNotice>
              Esta pagina mostra apenas o estado institucional das integracoes. Nenhuma conexao externa e iniciada por aqui nesta fase.
            </BackendNotice>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integracoes.map((it, i) => (
              <motion.div
                key={it.nome}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
                    <it.icon className="w-5 h-5 text-gray-600" />
                  </span>
                  <StatusBadge status={it.status} />
                </div>
                <h3 className="font-semibold mb-1">{it.nome}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{it.descricao}</p>
                <button
                  onClick={() => showToast(`A integracao ${it.nome} ainda nao pode ser configurada por esta tela.`)}
                  className="w-full py-2.5 bg-gray-100 text-foreground rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Ver status
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}



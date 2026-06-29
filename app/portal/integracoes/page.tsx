"use client"

import { motion } from "framer-motion"
import { Plus, Settings2 } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { toast } from "@/hooks/use-toast"

const integrations = [
  {
    name: "WhatsApp",
    description: "Centralize mensagens e atendimentos da agência quando a conexão real estiver disponível.",
    icon: "W",
    color: "bg-green-500",
    status: "Não configurado",
  },
  {
    name: "E-mail",
    description: "Sincronize sua caixa de entrada e acompanhe contatos da TravelPro.",
    icon: "@",
    color: "bg-blue-500",
    status: "Em preparação",
  },
  {
    name: "Stripe",
    description: "Faturamento e pagamentos serão conectados em uma etapa futura.",
    icon: "S",
    color: "bg-indigo-500",
    status: "Em preparação",
  },
  {
    name: "Google Calendar",
    description: "Reuniões e compromissos poderão ser sincronizados depois da integração real.",
    icon: "G",
    color: "bg-red-500",
    status: "Não configurado",
  },
]

export default function IntegracoesPage() {
  const handleAction = (name: string) => {
    toast({
      title: `${name} preparado`,
      description: "A configuração real será conectada ao backend posteriormente.",
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <PortalPageHeader title="Integrações" description="Conecte canais e ferramentas da TravelPro quando o backend estiver disponível." />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Catálogo de integrações</h2>
                <p className="text-sm text-muted-foreground">Nenhuma integração conectada ainda.</p>
              </div>
              <button
                onClick={() => toast({ title: "Integração preparada", description: "As conexões reais serão ativadas em uma próxima etapa." })}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FE6708] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#FE8414]"
              >
                <Plus className="w-4 h-4" />
                Nova integração
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => (
                <div key={item.name} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl ${item.color} flex items-center justify-center text-white text-lg font-semibold flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <span className="text-xs text-muted-foreground">{item.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleAction(item.name)}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      aria-label={`Configurar ${item.name}`}
                    >
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleAction(item.name)}
                    className="w-full mt-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Conectar
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

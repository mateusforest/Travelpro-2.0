"use client"

import { motion } from "framer-motion"
import { Mail, Plus, Shield } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { usePortalInteractions } from "@/components/portal/portal-interactions"
import { toast } from "@/hooks/use-toast"

const stats = [
  { label: "Membros ativos", value: "0", description: "Nenhum usuário cadastrado ainda." },
  { label: "Departamentos", value: "0", description: "Nenhum departamento criado ainda." },
  { label: "Convites pendentes", value: "0", description: "Nenhum convite enviado ainda." },
  { label: "Administradores", value: "0", description: "Nenhuma permissão atribuída ainda." },
]

export default function EquipePage() {
  const { openFilters } = usePortalInteractions()

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <PortalPageHeader title="Equipe" description="Gerencie membros, permissões e convites do seu time." />
            <button
              onClick={() => toast({ title: "Convite preparado", description: "Convites serão enviados quando o backend estiver conectado." })}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Convidar membro
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((item) => (
              <div key={item.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                <div>
                  <h2 className="font-semibold">Membros</h2>
                  <p className="text-sm text-muted-foreground">A lista será exibida aqui quando a equipe começar a ser cadastrada.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={openFilters} className="text-sm text-muted-foreground hover:text-[#0a0a0a] transition-colors">
                    Filtros
                  </button>
                  <button
                    onClick={() => toast({ title: "Convites vazios", description: "Nenhum convite pendente ainda." })}
                    className="text-sm text-muted-foreground hover:text-[#0a0a0a] transition-colors"
                  >
                    Ver todas
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-100 rounded-2xl p-6"
            >
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold">Permissões</h2>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center mb-4">
                <p className="text-sm text-muted-foreground">Nenhuma política de acesso configurada ainda.</p>
              </div>
              <button
                onClick={() => toast({ title: "Convites indisponíveis", description: "Convites serão enviados quando o backend estiver conectado." })}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Mail className="w-4 h-4" />
                Ver convites pendentes
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

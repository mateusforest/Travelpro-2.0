"use client"

import { CreditCard, Repeat, XCircle, TrendingUp, Calendar } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { BackendNotice, KpiCard, MasterPageHeader, PrimaryButton, StatusBadge, TableCard } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import { Plus } from "lucide-react"

const kpis = [
  { label: "Assinaturas ativas", value: "0", sublabel: "Nenhuma ativa ainda", icon: CreditCard },
  { label: "Trials", value: "0", sublabel: "Nenhum trial ainda", icon: Calendar },
  { label: "Canceladas", value: "0", sublabel: "Nenhuma cancelada", icon: XCircle },
  { label: "MRR", value: "R$ 0,00", sublabel: "receita recorrente mensal", icon: Repeat },
  { label: "ARR", value: "R$ 0,00", sublabel: "receita recorrente anual", icon: TrendingUp },
]

type Assinatura = {
  empresa: string
  plano: string
  status: string
  proximaCobranca: string
  valor: string
}

const assinaturas: Assinatura[] = []

export default function MasterAssinaturasPage() {
  const { showToast } = useMaster()

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Assinaturas"
            description="Status institucional das assinaturas da plataforma. A cobranca real ainda nao foi ativada nesta fase."
            actions={<PrimaryButton icon={Plus} onClick={() => showToast("As assinaturas reais ainda estao em preparacao nesta fase.")}>Nova assinatura</PrimaryButton>}
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} delay={i * 0.04} />
            ))}
          </div>

          <div className="mb-8">
            <BackendNotice>
              Nenhuma assinatura real esta sendo gerenciada por aqui ainda. Esta pagina foi mantida em estado honesto para evitar numeros ou acoes falsas.
            </BackendNotice>
          </div>

          <TableCard title="Assinaturas">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Próxima cobrança</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {assinaturas.map((a) => (
                  <tr key={a.empresa} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{a.empresa}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.plano}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.proximaCobranca}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-right">{a.valor}</td>
                  </tr>
                ))}
                {assinaturas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Nenhuma assinatura real registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </div>
  )
}



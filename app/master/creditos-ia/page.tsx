"use client"

import { Sparkles, Database, DollarSign, TrendingUp, Percent } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, KpiCard, BackendNotice } from "@/components/master/master-ui"

const kpis = [
  { label: "Créditos consumidos", value: "0", sublabel: "tokens no mês", icon: Sparkles },
  { label: "Créditos disponíveis", value: "0", sublabel: "saldo agregado", icon: Database },
  { label: "Custo IA", value: "R$ 0,00", sublabel: "estimado no mês", icon: DollarSign },
  { label: "Receita IA", value: "R$ 0,00", sublabel: "repasse aos clientes", icon: TrendingUp },
  { label: "Margem estimada", value: "—", sublabel: "sobre uso de IA", icon: Percent },
]

type Consumo = {
  empresa: string
  consumo: string
  custo: string
  receita: string
  margem: string
}

const consumos: Consumo[] = []

export default function MasterCreditosIAPage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Créditos IA"
            description="Consumo, custo e margem de inteligência artificial por cliente."
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} delay={i * 0.04} />
            ))}
          </div>

          <div className="mb-8">
            <BackendNotice>
              O consumo real de IA ainda nao esta integrado nesta fase. Os cards abaixo permanecem em estado honesto, sem simulacao de uso ou receita.
            </BackendNotice>
          </div>

          <TableCard title="Consumo por empresa">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Consumo</th>
                  <th className="px-5 py-3">Custo</th>
                  <th className="px-5 py-3">Receita</th>
                  <th className="px-5 py-3 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {consumos.map((c) => (
                  <tr key={c.empresa} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{c.empresa}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.consumo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.custo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.receita}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-right">{c.margem}</td>
                  </tr>
                ))}
                {consumos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Nenhum consumo de IA registrado ainda.
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


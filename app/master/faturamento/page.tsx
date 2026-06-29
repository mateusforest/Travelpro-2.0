"use client"

import { DollarSign, TrendingUp, Repeat, RotateCcw, Download } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { KpiCard, MasterPageHeader, SecondaryButton, TableCard } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

const kpis = [
  { label: "Receita mensal", value: "R$ 0,00", sublabel: "Sem dados ainda", icon: DollarSign },
  { label: "Receita anual", value: "R$ 0,00", sublabel: "projeção 2026", icon: TrendingUp },
  { label: "MRR", value: "R$ 0,00", sublabel: "recorrência mensal", icon: Repeat },
  { label: "ARR", value: "R$ 0,00", sublabel: "recorrência anual", icon: TrendingUp },
  { label: "Reembolsos", value: "R$ 0,00", sublabel: "Nenhum no mês", icon: RotateCcw },
]

type Lancamento = {
  mes: string
  receita: string
  reembolsos: string
  liquido: string
}

const lancamentos: Lancamento[] = []

export default function MasterFaturamentoPage() {
  const { showToast } = useMaster()

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Faturamento"
            description="Financeiro institucional do COS. Os dados reais de cobranca e repasse ainda nao foram ativados nesta fase."
            actions={
              <SecondaryButton icon={Download} onClick={() => showToast("A exportacao de faturamento real ainda esta em preparacao.")}>
                Exportar
              </SecondaryButton>
            }
          />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} delay={i * 0.04} />
            ))}
          </div>

          <TableCard title="Histórico mensal">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Mês</th>
                  <th className="px-5 py-3">Receita</th>
                  <th className="px-5 py-3">Reembolsos</th>
                  <th className="px-5 py-3 text-right">Receita líquida</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.mes} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{l.mes}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{l.receita}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{l.reembolsos}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-right">{l.liquido}</td>
                  </tr>
                ))}
                {lancamentos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Nenhum faturamento institucional real registrado ainda.
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




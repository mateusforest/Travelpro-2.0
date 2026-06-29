"use client"

import { PortalHeader } from "@/components/portal/portal-header"
import { FinancialManager } from "@/components/operations/financial-manager"

export default function FinanceiroPage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <FinancialManager
        title="Financeiro"
        description="Acompanhe o fluxo de caixa, ganhos, gastos e cobranças da sua agência."
        variant="portal"
      />
    </div>
  )
}

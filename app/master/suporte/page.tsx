"use client"

import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader } from "@/components/master/master-ui"
import { MasterSupportConsole } from "@/components/master/master-support-console"

export default function MasterSuportePage() {
  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader placeholder="Buscar no suporte..." />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Suporte"
            description="Chamados e conversas reais de suporte de toda a plataforma, com resposta, status e prioridade."
          />
          <MasterSupportConsole />
        </div>
      </div>
    </div>
  )
}

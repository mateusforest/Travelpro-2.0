"use client"

import { use } from "react"
import { AreaChat } from "@/components/app/area-chat"
import { equipeGroups } from "@/lib/area-configs"
import { UsersRound } from "lucide-react"

export default function EquipeGrupoPage({ params }: { params: Promise<{ grupo: string }> }) {
  const { grupo } = use(params)
  const group = equipeGroups[grupo]

  const label = group?.label ?? grupo.charAt(0).toUpperCase() + grupo.slice(1).replace(/-/g, " ")

  return (
    <AreaChat
      title={label}
      subtitle="Equipe · COS"
      icon={UsersRound}
      color="#0ea5e9"
      bg="#e0f2fe"
      messages={group?.messages ?? []}
      quickActions={[{ label: "Atribuir tarefa" }, { label: "Ver desempenho" }, { label: "Enviar mensagem" }]}
      emptyLabel={`Ainda não há mensagens em ${label}. Comece a conversa abaixo.`}
    />
  )
}

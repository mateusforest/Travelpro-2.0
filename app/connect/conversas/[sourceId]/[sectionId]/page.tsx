"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useConnect } from "@/components/connect/connect-store"
import { Plug, Wrench, Layers, ExternalLink } from "lucide-react"

export default function ConnectSectionChatPage({
  params,
}: {
  params: Promise<{ sourceId: string; sectionId: string }>
}) {
  const { sourceId, sectionId } = use(params)
  const router = useRouter()
  const { sources, openModal, toast } = useConnect()

  const source = sources.find((item) => item.id === sourceId) ?? null
  const section = source?.sections.find((item) => item.id === sectionId) ?? null

  if (!source || !section) {
    return (
      <AreaChat
        title="Sessao nao encontrada"
        subtitle="Esta sessao ainda nao esta disponivel para o seu workspace."
        icon={Plug}
        emptyLabel="Volte para Conversas e selecione uma sessao valida do Connect."
      />
    )
  }

  return (
    <AreaChat
      title={section.name}
      subtitle={`${source.name} · ${section.description || "Sessao operacional do Connect."}`}
      icon={Plug}
      emptyLabel={`Ainda nao ha mensagens nesta sessao. Converse com o COS sobre ${section.name}.`}
      quickActions={[
        {
          label: "Criar acao",
          icon: Wrench,
          onClick: () => openModal("action", { sourceId: source.id }),
        },
        {
          label: "Criar sessao",
          icon: Layers,
          onClick: () => openModal("section", { sourceId: source.id }),
        },
        {
          label: "Ver fonte",
          icon: ExternalLink,
          onClick: () => {
            if (source.accessUrl) {
              window.open(source.accessUrl, "_blank", "noopener,noreferrer")
              return
            }
            toast("Esta fonte ainda nao possui URL de acesso configurada.")
          },
        },
      ]}
      onSendMessage={(_, now) => ({
        messages: [
          {
            from: "cos",
            text: "Esta sessao ja organiza a fonte no Connect, mas ainda nao executa integracoes externas. Use as acoes configuradas como referencia operacional.",
            time: now,
          } satisfies ChatMessage,
        ],
      })}
    />
  )
}

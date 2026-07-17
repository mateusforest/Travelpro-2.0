"use client"

import { use, useEffect, useState } from "react"
import {
  getOperationsConversationMessagesAction,
  runOperationsEngineAction,
} from "@/actions/operations-engine"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useOperationsDashboard } from "@/components/app/operations-dashboard-store"
import { areaConfigs, slug } from "@/lib/area-configs"

function resolveSubAreaConversationInput(area: string, sub: string) {
  if (area === "studio-ia") {
    return {
      area: "sistema",
      subArea: `studio-ia-${sub}`,
    }
  }

  return {
    area,
    subArea: sub,
  }
}

function resolveChatCopy(area: string, subLabel: string) {
  if (area === "cadastros") {
    return {
      subtitle: `Conversa contextual de ${subLabel.toLowerCase()} do seu workspace.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero cadastrar um cliente", "Buscar cliente pelo nome", "Mostrar clientes com pendencias"],
    }
  }

  if (area === "operacoes") {
    return {
      subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero criar uma viagem", "Buscar viagem por cliente", "Mostrar viagens com pendencias"],
    }
  }

  if (area === "vendas") {
    return {
      subtitle: `Conversa de cotações sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero montar uma cotacao", "Buscar cotacao por cliente", "Mostrar cotacoes em aberto"],
    }
  }

  if (area === "financeiro") {
    return {
      subtitle: `Conversa financeira sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero registrar um recebimento", "Quero registrar um pagamento", "Mostrar resumo financeiro"],
    }
  }

  if (area === "equipe") {
    return {
      subtitle: `Conversa contextual de fornecedores ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre a equipe ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero adicionar um fornecedor", "Buscar fornecedor por nome", "Mostrar fornecedores ativos"],
    }
  }

  if (area === "documentos") {
    return {
      subtitle: `Conversa documental sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Quero criar um documento", "Buscar documento por nome", "Mostrar documentos recentes"],
    }
  }

  if (area === "studio-ia") {
    return {
      subtitle: `Conversa contextual do Studio IA sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar sobre ${subLabel.toLowerCase()} no Studio IA.`,
      quickActions: [
        `Quero planejar ${subLabel.toLowerCase()}`,
        `Quero organizar ${subLabel.toLowerCase()} da agencia`,
        `Quero revisar prioridades de ${subLabel.toLowerCase()}`,
      ],
    }
  }

  return {
    subtitle: `${subLabel} · COS Operacoes`,
    emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
    quickActions: [`Quero falar sobre ${subLabel.toLowerCase()}`],
  }
}

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const config = areaConfigs[area]
  const { refreshSummary } = useOperationsDashboard()
  const [messages, setMessages] = useState<ChatMessage[]>(config?.messages ?? [])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  const subLabel =
    config?.subsections.find((section) => slug(section) === sub) ??
    sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, " ")

  const chatCopy = resolveChatCopy(area, subLabel)
  const conversationInput = resolveSubAreaConversationInput(area, sub)

  useEffect(() => {
    let isMounted = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      const result = await getOperationsConversationMessagesAction(conversationInput)

      if (!isMounted) {
        return
      }

      if (result.success) {
        setMessages(result.messages)
      } else {
        setMessages(config?.messages ?? [])
      }

      setIsLoadingMessages(false)
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [area, sub, config, conversationInput.area, conversationInput.subArea])

  return (
    <AreaChat
      conversationKey={`${area}/${sub}`}
      title={subLabel}
      subtitle={chatCopy.subtitle}
      icon={config?.icon ?? areaConfigs.sistema.icon}
      color={config?.color}
      bg={config?.bg}
      messages={messages}
      isLoadingHistory={isLoadingMessages}
      quickActions={chatCopy.quickActions.map((label) => ({ label }))}
      onSendMessage={async (input, now) => {
        try {
          const result = await runOperationsEngineAction({
            message: input,
            area: conversationInput.area,
            subArea: conversationInput.subArea,
          })
          const responseText =
            typeof result.message === "string" && result.message.trim()
              ? result.message
              : "Nao consegui executar sua solicitacao agora. Tente novamente em instantes."
          const ctaLabel =
            "suggestedLabel" in result && typeof result.suggestedLabel === "string" ? result.suggestedLabel : undefined
          const ctaHref =
            "suggestedHref" in result && typeof result.suggestedHref === "string" ? result.suggestedHref : undefined

          if (result.ok) {
            void refreshSummary({ silent: true, force: true })
          }

          return {
            messages: [
              {
                id: `subarea-cos-${Date.now()}`,
                from: "cos",
                text: responseText,
                time: now,
                ctaLabel,
                ctaHref,
              },
            ],
          }
        } catch {
          return {
            messages: [
              {
                id: `subarea-cos-error-${Date.now()}`,
                from: "cos",
                text: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
                time: now,
              },
            ],
          }
        }
      }}
      emptyLabel={chatCopy.emptyLabel}
    />
  )
}

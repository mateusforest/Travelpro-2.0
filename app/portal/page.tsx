"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bell,
  Sparkles,
  CheckSquare,
  UserPlus,
  FileText,
  CreditCard,
  MoreHorizontal,
  FileSignature,
  TrendingUp,
  Users,
  Mic,
  Plus,
  Video,
  Send,
} from "lucide-react"
import Link from "next/link"
import { PortalHeader } from "@/components/portal/portal-header"
import { usePortalInteractions } from "@/components/portal/portal-interactions"
import { toast } from "@/hooks/use-toast"
import { getPortalHomeOverviewAction } from "@/actions/activity"

type Insight = {
  id: string
  type: string
  typeColor?: string
  title: string
  description: string
  action: string
}

type MicState = "idle" | "listening" | "processing" | "unsupported" | "error"

type SpeechRecognitionEventLike = {
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      length: number
      [innerIndex: number]: { transcript: string }
    }
  }
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: null | (() => void)
  onresult: null | ((event: SpeechRecognitionEventLike) => void)
  onerror: null | ((event: { error: string }) => void)
  onend: null | (() => void)
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const defaultStats = [
  {
    label: "Viagens ativas",
    value: "0",
    sublabel: "nenhuma viagem em andamento",
    extra: { value: "0", label: "prioritárias", color: "text-[#FE6708]" },
    chart: true,
  },
  {
    label: "Faturamento do mês",
    value: "R$ 0,00",
    sublabel: "Nenhum faturamento registrado",
    sublabelColor: "text-muted-foreground",
  },
  {
    label: "Clientes",
    value: "0",
    sublabel: "nenhum cliente cadastrado",
    icon: Users,
  },
  {
    label: "Notificações",
    value: "0",
    sublabel: "nenhuma notificação",
    sublabelColor: "text-muted-foreground",
    icon: Bell,
    notifications: [] as { count: number; label: string }[],
  },
]

const conversations = [
  {
    icon: FileSignature,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Nenhuma viagem registrada",
    description: "As viagens da agência aparecerão aqui quando a operação começar.",
    time: "—",
  },
  {
    icon: TrendingUp,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "Nenhuma viagem registrada",
    description: "Nenhum histórico de cotação disponível ainda.",
    time: "—",
  },
  {
    icon: Users,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "Nenhuma viagem registrada",
    description: "Quando houver reservas e clientes reais, eles aparecerão aqui.",
    time: "—",
  },
]

const integrations = [
  { name: "WhatsApp", icon: "W", color: "bg-green-500", status: "Não configurado", href: "/portal/integracoes" },
  { name: "Email", icon: "@", color: "bg-blue-500", status: "Não configurado", href: "/portal/integracoes" },
]

const initialInsights: Insight[] = [
  { id: "oportunidade", type: "Oportunidade", title: "Nenhum insight disponível ainda", description: "Os insights aparecerão quando houver dados reais de clientes, viagens e reservas.", action: "Entendi" },
  { id: "alerta", type: "Alerta", typeColor: "text-red-500", title: "Nenhum alerta disponível", description: "Nenhum faturamento registrado ainda.", action: "Entendi" },
  { id: "resumo", type: "Resumo", title: "Nenhuma agenda registrada", description: "Os próximos compromissos aparecerão aqui.", action: "Entendi" },
]

export default function PortalHomePage() {
  const router = useRouter()
  const { openQuickActions } = usePortalInteractions()
  const [chatInput, setChatInput] = useState("")
  const [insights, setInsights] = useState(initialInsights)
  const [micState, setMicState] = useState<MicState>("idle")
  const [micPreview, setMicPreview] = useState("")
  const [isRedirectingToApp, setIsRedirectingToApp] = useState(false)
  const [stats, setStats] = useState(defaultStats)
  const [recentActivities, setRecentActivities] = useState<Array<{ id: string; action: string; actionLabel?: string; description: string }>>([])

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef("")
  const micActionRef = useRef<"finalize" | "cancel">("finalize")

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    const loadPortalData = async () => {
      const overviewResult = await getPortalHomeOverviewAction()

      if (overviewResult.success && overviewResult.overview) {
        setStats((prev) =>
          prev.map((stat) => {
            if (stat.label === "Faturamento do mês") {
              return {
                ...stat,
                value: overviewResult.overview.financial.monthIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                sublabel:
                  overviewResult.overview.financial.monthIncome > 0 ? "Entradas reais registradas" : "Nenhum faturamento registrado",
              }
            }
            return stat
          }),
        )
        setRecentActivities(
          overviewResult.overview.logs as Array<{ id: string; action: string; actionLabel?: string; description: string }>,
        )
      }
    }

    void loadPortalData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  const buildRecognition = () => {
    if (typeof window === "undefined") return null

    const SpeechRecognitionAPI = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor
        webkitSpeechRecognition?: SpeechRecognitionConstructor
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor
          webkitSpeechRecognition?: SpeechRecognitionConstructor
        }
      ).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) return null

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "pt-BR"
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => {
      setMicState("listening")
      setMicPreview("")
      finalTranscriptRef.current = ""
      toast({ title: "Microfone ativo", description: "Ouvindo..." })
    }
    recognition.onresult = (event) => {
      let interim = ""
      let finalText = finalTranscriptRef.current

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ""
        if (result.isFinal) {
          finalText += `${transcript} `
        } else {
          interim += transcript
        }
      }

      finalTranscriptRef.current = finalText.trim()
      setMicPreview(`${finalText} ${interim}`.trim())
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicState("error")
        toast({ title: "Microfone bloqueado", description: "Permissão de microfone negada." })
        return
      }

      setMicState("error")
      toast({ title: "Erro de voz", description: "Não foi possível processar o áudio." })
    }
    recognition.onend = () => {
      const finalText = finalTranscriptRef.current.trim()

      if (micActionRef.current === "cancel") {
        setMicPreview("")
        setMicState("idle")
        finalTranscriptRef.current = ""
        micActionRef.current = "finalize"
        return
      }

      if (finalText) {
        setMicState("processing")
        setChatInput((prev) => [prev.trim(), finalText].filter(Boolean).join(" "))
        setMicPreview("")
        toast({ title: "Transcrição concluída", description: "Transcrição adicionada ao campo." })
      }

      setMicState("idle")
      finalTranscriptRef.current = ""
      micActionRef.current = "finalize"
    }

    recognitionRef.current = recognition
    return recognition
  }

  const startListening = () => {
    const recognition = recognitionRef.current ?? buildRecognition()
    if (!recognition) {
      setMicState("unsupported")
      toast({ title: "Microfone indisponível", description: "Ditado por voz não disponível neste navegador." })
      return
    }

    try {
      micActionRef.current = "finalize"
      finalTranscriptRef.current = ""
      setMicPreview("")
      recognition.start()
    } catch {
      setMicState("error")
      toast({ title: "Microfone indisponível", description: "Não foi possível iniciar a captura de voz." })
    }
  }

  const finalizeListening = () => {
    if (micState !== "listening") return
    setMicState("processing")
    recognitionRef.current?.stop()
  }

  const cancelListening = () => {
    micActionRef.current = "cancel"
    recognitionRef.current?.stop()
  }

  const submitChat = () => {
    if (!chatInput.trim()) {
      toast({ title: "Campo vazio", description: "Digite ou dite uma mensagem antes de enviar." })
      return
    }

    setIsRedirectingToApp(true)
    toast({
      title: "Conversa operacional no app",
      description: "O chat com execucao real do TravelPro acontece em /app. Estamos te levando para la.",
    })
    setChatInput("")
    setMicPreview("")
    router.push("/app")
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#FE6708]" />
              <h1 className="text-2xl font-semibold">{getGreeting()}.</h1>
            </div>
            <p className="text-muted-foreground">O que vamos organizar hoje na TravelPro?</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-3 mb-8">
            <Link href="/portal/cadastros" className="flex items-center gap-2 rounded-full border border-[#FED2B4] bg-white px-4 py-2.5 text-sm transition-all hover:border-[#FE8414] hover:bg-[#FFF4EC]">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              <span>Novo cliente</span>
            </Link>
            <Link href="/portal/viagens" className="flex items-center gap-2 rounded-full border border-[#FED2B4] bg-white px-4 py-2.5 text-sm transition-all hover:border-[#FE8414] hover:bg-[#FFF4EC]">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <span>Nova viagem</span>
            </Link>
            <Link href="/portal/vendas" className="flex items-center gap-2 rounded-full border border-[#FED2B4] bg-white px-4 py-2.5 text-sm transition-all hover:border-[#FE8414] hover:bg-[#FFF4EC]">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Nova cotação</span>
            </Link>
            <Link href="/portal/conversas" className="flex items-center gap-2 rounded-full border border-[#FED2B4] bg-white px-4 py-2.5 text-sm transition-all hover:border-[#FE8414] hover:bg-[#FFF4EC]">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span>Nova reserva</span>
            </Link>
            <button onClick={openQuickActions} className="flex items-center gap-2 rounded-full border border-[#FED2B4] bg-white px-4 py-2.5 text-sm transition-all hover:border-[#FE8414] hover:bg-[#FFF4EC]">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              <span>Mais ações</span>
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  {stat.icon && <stat.icon className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p className="text-2xl font-semibold mb-1">{stat.value}</p>
                <p className={`text-sm ${stat.sublabelColor || "text-muted-foreground"}`}>{stat.sublabel}</p>
                {stat.extra && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xl font-semibold">{stat.extra.value}</span>
                    <span className={`text-sm ${stat.extra.color}`}>{stat.extra.label}</span>
                  </div>
                )}
                {stat.chart && (
                  <div className="mt-4 flex items-end gap-1 h-12">
                    {[40, 60, 30, 80, 50, 70].map((h, j) => (
                      <div key={j} className="flex-1 bg-gray-100 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                )}
                {!stat.chart && stat.label === "Clientes" && (
                  <div className="mt-3 text-sm text-muted-foreground">Nenhum cliente ativo disponível.</div>
                )}
                {Array.isArray(stat.notifications) && stat.notifications.length === 0 && stat.label === "Notificações" && (
                  <div className="mt-3 text-sm text-muted-foreground">Nenhum alerta disponível.</div>
                )}
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Viagens recentes</h2>
                  <Link href="/portal/viagens" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todas</Link>
                </div>
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <Link key={conv.title + conv.description} href="/portal/viagens" className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl ${conv.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <conv.icon className={`w-5 h-5 ${conv.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{conv.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{conv.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Documentos recentes</h2>
                  <Link href="/portal/documentos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todos</Link>
                </div>
                <div className="py-10 text-center text-sm text-muted-foreground">Nenhum documento disponível ainda.</div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Insights TravelPro</h2>
                  <Link href="/portal/relatorios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todos</Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {insights.map((insight) => (
                    <div key={insight.id} className="p-4 bg-gray-50 rounded-xl">
                      <span className={`text-xs font-medium ${insight.typeColor || "text-muted-foreground"}`}>{insight.type}</span>
                      <p className="font-medium mt-1 mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>
                      <button
                        onClick={() => setInsights((prev) => prev.filter((item) => item.id !== insight.id))}
                        className="text-xs font-medium text-foreground border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        {insight.action}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold mb-1">Próximas ações</h2>
                    <p className="text-sm text-muted-foreground">Acompanhe o que precisa avançar na operação da agência.</p>
                  </div>
                  <Link href="/portal/operacoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todas</Link>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-medium text-[#0a0a0a]">Nenhuma pendência crítica no momento.</p>
                    <p className="text-sm text-muted-foreground mt-1">As próximas ações operacionais aparecerão aqui quando houver dados disponíveis.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Link href="/portal/conversas" className="rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-[#0a0a0a]">Revisar reservas</p>
                      <p className="text-sm text-muted-foreground mt-1">Nenhuma reserva pendente.</p>
                    </Link>
                    <Link href="/portal/vendas" className="rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-[#0a0a0a]">Acompanhar cotações</p>
                      <p className="text-sm text-muted-foreground mt-1">Nenhuma cotação pendente.</p>
                    </Link>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Integrações ativas</h2>
                  <Link href="/portal/integracoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todas</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {integrations.map((integration) => (
                    <Link key={integration.name} href={integration.href} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl ${integration.color} flex items-center justify-center text-white font-semibold`}>
                        {integration.icon}
                      </div>
                      <span className="text-xs text-center truncate w-full">{integration.name}</span>
                      <span className="text-xs text-gray-400">{integration.status}</span>
                    </Link>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Atividades recentes</h2>
                  <Link href="/portal/operacoes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todas</Link>
                </div>
                {recentActivities.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Nenhum registro ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="rounded-xl border border-gray-100 px-4 py-3">
                        <p className="text-sm font-medium text-[#0a0a0a]">{activity.actionLabel || activity.action}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={openQuickActions} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={startListening}
                className={`p-2 rounded-xl transition-colors ${micState === "listening" ? "bg-red-100 text-red-500" : "hover:bg-gray-100 text-muted-foreground"}`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <Link href="/portal/reunioes" className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm text-muted-foreground hover:bg-gray-200 transition-colors">
                <Video className="w-4 h-4" />
                <span>Agenda</span>
              </Link>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={chatInput || micPreview}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Fale com o TravelPro..."
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <button
              onClick={submitChat}
              disabled={!chatInput.trim() || isRedirectingToApp}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${chatInput ? "bg-[#FE6708] text-white hover:bg-[#FE8414]" : "bg-gray-100 text-muted-foreground"} disabled:cursor-not-allowed disabled:opacity-60`}>
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-5 text-muted-foreground">
            O Portal nao executa conversa operacional por aqui. Para falar com o TravelPro e persistir mensagens reais, use o app.
          </div>

          {micState !== "idle" && (
            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-medium text-[#0a0a0a]">
                {micState === "listening" && "Ouvindo..."}
                {micState === "processing" && "Processando transcrição..."}
                {micState === "unsupported" && "Ditado por voz indisponível"}
                {micState === "error" && "Erro no microfone"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {micState === "listening" && (micPreview || "Fale em português para preencher o campo do TravelPro.")}
                {micState === "processing" && "A transcrição será adicionada ao campo em seguida."}
                {micState === "unsupported" && "Ditado por voz não disponível neste navegador."}
                {micState === "error" && "Permissão de microfone negada."}
              </p>
              {micState === "listening" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={cancelListening} className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={finalizeListening} className="flex-1 rounded-xl bg-[#FE6708] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#FE8414]">
                    Finalizar
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground mt-3">
            O TravelPro pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  )
}


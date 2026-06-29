"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Settings2, Sparkles, CreditCard, Plug, ShieldCheck, LogOut, type LucideIcon } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader } from "@/components/master/master-ui"
import { useMasterSession } from "@/components/master/master-session"
import { getMasterSettingsOverviewAction } from "@/actions/master"

type Secao = {
  id: string
  label: string
  icon: LucideIcon
  descricao: string
}

type SettingsOverview = {
  platformName: string
  appUrl: string | null
  environment: string
  status: string
  aiConfigured: boolean
  stripeConfigured: boolean
  integrations: Array<{ name: string; status: string }>
  currentUser: {
    name: string
    email: string
    role: string
  }
}

const secoes: Secao[] = [
  { id: "geral", label: "Geral", icon: Settings2, descricao: "Nome da plataforma, ambiente atual e status geral." },
  { id: "ia", label: "IA", icon: Sparkles, descricao: "Estado atual da configuracao de IA." },
  { id: "cobranca", label: "Cobranca", icon: CreditCard, descricao: "Estado atual da configuracao de faturamento." },
  { id: "integracoes", label: "Integracoes", icon: Plug, descricao: "Servicos globais e seus estados atuais." },
  { id: "seguranca", label: "Seguranca", icon: ShieldCheck, descricao: "Conta master atual e acesso seguro." },
]

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-[#0a0a0a] text-right">{value}</span>
    </div>
  )
}

export default function MasterConfiguracoesPage() {
  const [ativa, setAtiva] = useState(secoes[0].id)
  const secao = secoes.find((s) => s.id === ativa)!
  const { handleLogout, isPending } = useMasterSession()
  const [settings, setSettings] = useState<SettingsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      const result = await getMasterSettingsOverviewAction()

      if (result.error) {
        setError(result.error)
        setSettings(null)
        setIsLoading(false)
        return
      }

      setSettings((result.settings ?? null) as SettingsOverview | null)
      setIsLoading(false)
    }

    void load()
  }, [])

  const content = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-gray-50 px-4 py-3">
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )
    }

    if (!settings) {
      return <p className="text-sm text-gray-500">Nenhum dado disponivel no momento.</p>
    }

    if (secao.id === "geral") {
      return (
        <div className="space-y-3">
          <InfoRow label="Nome da plataforma" value={settings.platformName} />
          <InfoRow label="URL atual da aplicacao" value={settings.appUrl || "Nao configurada"} />
          <InfoRow label="Ambiente" value={settings.environment} />
          <InfoRow label="Status" value={settings.status} />
        </div>
      )
    }

    if (secao.id === "ia") {
      return (
        <div className="space-y-3">
          <InfoRow label="OpenAI" value={settings.aiConfigured ? "Configurado" : "Nao configurado"} />
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            As chaves nao sao exibidas aqui. Esta area mostra apenas o estado atual da configuracao.
          </div>
        </div>
      )
    }

    if (secao.id === "cobranca") {
      return (
        <div className="space-y-3">
          <InfoRow label="Stripe" value={settings.stripeConfigured ? "Configurado" : "Nao configurado"} />
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            O estado de cobranca reflete a presenca segura da configuracao server-side.
          </div>
        </div>
      )
    }

    if (secao.id === "integracoes") {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {settings.integrations.map((integration) => (
            <div key={integration.name} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-1 text-sm font-medium text-[#0a0a0a]">{integration.name}</div>
              <div className="text-sm text-gray-500">{integration.status}</div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <InfoRow label="Usuario master atual" value={settings.currentUser.name} />
        <InfoRow label="E-mail" value={settings.currentUser.email || "Nenhum e-mail cadastrado"} />
        <InfoRow label="Role" value={settings.currentUser.role} />
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-medium text-[#0a0a0a]">Nenhum dispositivo registrado ainda.</p>
          <p className="mt-1 text-sm text-gray-500">
            As sessoes conectadas serao exibidas quando o monitoramento de dispositivos estiver ativo.
          </p>
        </div>
        <button
          onClick={() => handleLogout()}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "Saindo..." : "Sair da conta"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <MasterPageHeader title="Configuracoes" description="Ajustes globais do ecossistema COS." />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide lg:flex-col">
              {secoes.map((s) => {
                const active = s.id === ativa
                return (
                  <button
                    key={s.id}
                    onClick={() => setAtiva(s.id)}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 transition-all ${
                      active ? "border border-gray-100 bg-white font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
                    }`}
                  >
                    <s.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{s.label}</span>
                  </button>
                )
              })}
            </nav>

            <motion.div
              key={secao.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <secao.icon className="h-5 w-5 text-gray-600" />
                </span>
                <div>
                  <h2 className="font-semibold">{secao.label}</h2>
                  <p className="text-sm text-muted-foreground">{secao.descricao}</p>
                </div>
              </div>
              {content()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

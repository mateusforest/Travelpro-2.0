import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Circle,
  CirclePlay,
  FileText,
  History,
  MessageSquare,
  Plane,
  Settings,
  Users,
  Wallet,
} from "lucide-react"

const mainNav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Para agências", href: "#para-agencias" },
  { label: "Recursos", href: "#recursos" },
  { label: "Preços", href: "#precos" },
]

const sidebarItems = [
  { label: "Conversas", icon: MessageSquare, active: true },
  { label: "Clientes", icon: Users },
  { label: "Viagens", icon: Plane },
  { label: "Financeiro", icon: Wallet },
  { label: "Documentos", icon: FileText },
  { label: "Histórico", icon: History },
]

const executionItems = [
  { label: "Clientes", detail: "2 criados", icon: Users },
  { label: "Viagem", detail: "1 criada", icon: Plane },
  { label: "Financeiro", detail: "iniciado", icon: Wallet },
  { label: "Documentos", detail: "2 vinculados", icon: FileText },
  { label: "Histórico", detail: "atualizado", icon: History },
]

const dashboardKpis = [
  { label: "Faturamento (mês)", value: "R$ 245.680,00", delta: "+ 18,2%" },
  { label: "A receber", value: "R$ 82.460,00", delta: "+ 12,3%" },
  { label: "Viagens ativas", value: "24", delta: "+ 2,4%" },
  { label: "Clientes ativos", value: "156", delta: "+ 14,6%" },
]

const recentTrips = [
  { trip: "Aruba · Jul/2025", client: "João da Silva e Maria", status: "Confirmada" },
  { trip: "Paris · Ago/2025", client: "Carlos e Ana", status: "Em andamento" },
  { trip: "Orlando · Set/2025", client: "Família Gomes", status: "Confirmada" },
  { trip: "Cancún · Out/2025", client: "Luciana Matos", status: "Aguardando pagamento" },
  { trip: "Roma · Nov/2025", client: "Fernanda Chaves", status: "Planejada" },
]

const upcomingTrips = [
  { destination: "Paris", window: "Embarque em 5 dias" },
  { destination: "Aruba", window: "Embarque em 12 dias" },
  { destination: "Orlando", window: "Embarque em 18 dias" },
]

const recentActivity = [
  "Contrato enviado para cliente",
  "Pagamento recebido",
  "Documento adicionado",
]

function TravelProMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#ff7a1a_0%,#fe6708_100%)] shadow-[0_8px_20px_rgba(254,103,8,0.22)] ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-4.5 w-4.5 fill-white" aria-hidden="true">
        <path d="M15.2 4.6c1 0 1.8.8 1.8 1.8v4.7l7.2 4.1c.8.5 1.1 1.5.7 2.3l-.4.8c-.4.8-1.3 1.2-2.2.9L17 18v7l2.4 1.8c.5.4.7 1 .4 1.6l-.2.4c-.2.6-.8.9-1.4.9H13.8c-.6 0-1.1-.3-1.4-.9l-.2-.4c-.3-.6-.1-1.2.4-1.6L15 25v-7l-5.3 1.1c-.9.3-1.8-.1-2.2-.9l-.4-.8c-.4-.8-.1-1.8.7-2.3l7.2-4.1V6.4c0-1 .8-1.8 1.8-1.8h-.6Z" />
      </svg>
    </div>
  )
}

function HeroSymbol() {
  return (
    <div className="relative mx-auto flex aspect-[0.95/1] w-full max-w-[520px] items-end justify-center">
      <div className="absolute inset-x-[10%] bottom-0 h-12 rounded-full bg-[radial-gradient(circle,rgba(254,103,8,0.18)_0%,rgba(254,103,8,0.08)_35%,rgba(254,103,8,0)_72%)] blur-2xl" />
      <div className="absolute inset-y-[6%] right-[10%] w-[68%] rounded-t-[38%] rounded-b-[14%] bg-[#ffb079] opacity-40 blur-[1px]" />
      <div className="relative flex h-full w-[72%] min-w-[280px] items-center justify-center rounded-t-[42%] rounded-b-[14%] bg-[linear-gradient(180deg,#ff931f_0%,#fe6708_100%)] shadow-[0_40px_90px_rgba(254,103,8,0.18)]">
        <div className="absolute bottom-0 left-1/2 h-[46%] w-[30%] -translate-x-1/2 rounded-t-full bg-[linear-gradient(180deg,#fff6eb_0%,#ffffff_100%)]" />
        <svg
          viewBox="0 0 96 96"
          aria-hidden="true"
          className="relative z-10 h-[42%] w-[42%] fill-white drop-shadow-[0_10px_12px_rgba(128,48,0,0.18)]"
        >
          <path d="M46 8a4 4 0 0 1 4 4v19.2l22.2 12.6c2.1 1.2 2.9 3.8 1.8 5.9l-1 1.8c-1 2.1-3.5 3.1-5.8 2.4L50 49.6V67l8.3 6.2c1.7 1.3 2.3 3.5 1.4 5.4l-.7 1.5A4.3 4.3 0 0 1 55.2 83H40.8a4.3 4.3 0 0 1-3.8-2.9l-.7-1.5c-.9-1.9-.3-4.1 1.4-5.4L46 67V49.6l-17.2 4.3c-2.3.7-4.8-.3-5.8-2.4l-1-1.8c-1.1-2.1-.3-4.7 1.8-5.9L46 31.2V12a4 4 0 0 1 4-4Z" />
        </svg>
      </div>
    </div>
  )
}

function VideoPlaceholder() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[30px] bg-[linear-gradient(180deg,#050608_0%,#090b10_100%)] p-7 text-white">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">
          Veja na prática
        </span>
        <h2 className="mt-5 max-w-[220px] text-4xl font-medium leading-[1.06] tracking-[-0.05em] text-white">
          Converse.
          <br />
          O TravelPro
          <br />
          executa.
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8">
          <CirclePlay className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Assistir vídeo</p>
          <p className="text-xs text-white/55">01:32</p>
        </div>
      </div>
    </div>
  )
}

function ChatShowcase() {
  return (
    <div className="grid gap-4 rounded-[36px] bg-[#0d0f14] p-3 shadow-[0_35px_90px_rgba(0,0,0,0.16)] md:grid-cols-[0.82fr_1.55fr_0.72fr] md:p-4">
      <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,#171a20_0%,#12151b_100%)] p-5 text-white/78">
        <div className="flex items-center gap-3">
          <TravelProMark className="h-7 w-7 rounded-[8px]" />
          <span className="text-[15px] font-medium text-white">TravelPro</span>
        </div>
        <div className="mt-7 space-y-2">
          {sidebarItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                item.active ? "bg-[#242830] text-[#ff7a1a]" : "text-white/68"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 flex items-center justify-between text-sm text-white/52">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,#14181e_0%,#11151b_100%)] p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Conversas</span>
          <span className="rounded-full bg-white/4 px-3 py-1 text-xs text-white/45">Hoje</span>
        </div>
        <div className="mt-5 flex justify-end">
          <div className="max-w-[300px] rounded-[22px] bg-[#262b34] px-4 py-4 text-sm leading-6 text-white/86">
            Crie uma viagem para João e Maria para Aruba em julho.
            <div className="mt-3 text-right text-[11px] text-white/35">11:30</div>
          </div>
        </div>
        <div className="mt-5 flex gap-4">
          <TravelProMark className="mt-2 h-8 w-8 rounded-[10px]" />
          <div className="flex-1 rounded-[24px] bg-[#1b2028] px-5 py-5 text-sm leading-7 text-white/88">
            <p>Entendi! Vou criar a viagem para João e Maria com destino Aruba em julho.</p>
            <p className="mt-3 text-white/72">Preparando tudo para você:</p>
            <ul className="mt-4 space-y-1.5 text-white/84">
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Cliente criado: João da Silva
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Cliente criado: Maria da Silva
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Viagem criada: Aruba • Jul/2025
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Financeiro iniciado
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Documentos vinculados
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Histórico atualizado
              </li>
            </ul>
            <div className="mt-4 text-right text-[11px] text-white/35">11:31</div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-full border border-white/6 bg-[#12161c] px-4 py-3">
          <span className="flex-1 text-sm text-white/36">Digite sua mensagem...</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7a1a]">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,#171b21_0%,#12151b_100%)] p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Em execução</span>
        </div>
        <div className="mt-6 space-y-3">
          {executionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-[20px] bg-white/[0.03] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/6 bg-[#1d2229]">
                <item.icon className="h-4 w-4 text-white/78" />
              </div>
              <div>
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-xs text-white/48">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
            <Circle className="h-4 w-4 fill-white/70 text-white/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardShowcase() {
  return (
    <div className="rounded-[36px] border border-black/[0.04] bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.08)] sm:p-5 lg:p-6">
      <div className="grid gap-4 md:grid-cols-[0.78fr_2fr]">
        <div className="rounded-[28px] border border-black/[0.04] bg-[#fcfcfb] p-5">
          <div className="flex items-center gap-3">
            <TravelProMark className="h-7 w-7 rounded-[8px]" />
            <span className="text-[15px] font-medium text-black">TravelPro</span>
          </div>
          <div className="mt-7 space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${
                  index === 0 ? "bg-[#f5f3ef] text-[#0a0a0a]" : "text-[#737373]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{index === 0 ? "Início" : item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#8a8a8a]">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/[0.04] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-medium tracking-[-0.04em] text-[#0a0a0a]">Visão geral</h3>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-black/[0.06] px-3 py-1.5 text-sm text-[#4f4f4f]">
              <span className="h-7 w-7 rounded-full bg-[linear-gradient(135deg,#f2ccb8_0%,#8c5a43_100%)]" />
              Agência Exemplo
            </div>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-4">
            {dashboardKpis.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-black/[0.04] bg-[#fffdfa] p-4">
                <p className="text-xs text-[#8a8a8a]">{item.label}</p>
                <p className="mt-2 text-[1.75rem] font-medium tracking-[-0.05em] text-[#0a0a0a]">{item.value}</p>
                <p className="mt-2 text-xs text-[#1fa66b]">{item.delta}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
            <div className="rounded-[24px] border border-black/[0.04] p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Viagens recentes</h4>
                <BarChart3 className="h-4 w-4 text-[#b3b3b3]" />
              </div>
              <div className="mt-4 space-y-3">
                {recentTrips.map((trip) => (
                  <div key={trip.trip} className="grid gap-2 border-b border-black/[0.04] pb-3 last:border-b-0 last:pb-0 md:grid-cols-[1.15fr_0.9fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-medium text-[#0a0a0a]">{trip.trip}</p>
                      <p className="text-xs text-[#8a8a8a]">{trip.client}</p>
                    </div>
                    <p className="text-xs text-[#8a8a8a]">{trip.status}</p>
                    <p className="text-xs text-[#b0b0b0]">10 Jul 2025</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-black/[0.04] p-4">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Próximas viagens</h4>
                <div className="mt-4 space-y-3">
                  {upcomingTrips.map((trip) => (
                    <div key={trip.destination} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0a0a0a]">{trip.destination}</p>
                        <p className="text-xs text-[#8a8a8a]">{trip.window}</p>
                      </div>
                      <TravelProMark className="h-6 w-6 rounded-[7px]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-black/[0.04] p-4">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Atividades recentes</h4>
                <div className="mt-4 space-y-3">
                  {recentActivity.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="h-2 w-2 rounded-full bg-[#8fd5ad]" />
                      <p className="text-xs text-[#7d7d7d]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TravelProHomepage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f2] text-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[680px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.78)_36%,rgba(248,246,242,0)_72%)]" />
        <div className="absolute right-[-120px] top-[220px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(254,103,8,0.09)_0%,rgba(254,103,8,0)_72%)] blur-3xl" />
        <div className="absolute left-[-120px] top-[980px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(248,246,242,0)_72%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 pb-24 pt-5 sm:px-8 lg:px-12">
        <header className="animate-tp-fade flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-3">
            <TravelProMark />
            <span className="text-[2rem] font-medium tracking-[-0.05em] text-[#111111] sm:text-[2.1rem]">
              TravelPro
            </span>
          </Link>

          <nav className="hidden items-center gap-12 text-[15px] text-[#3a3a3a] lg:flex">
            {mainNav.map((item) => (
              <a key={item.label} href={item.href} className="transition-opacity duration-200 hover:opacity-65">
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full bg-[#06070a] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)] transition-transform duration-200 hover:scale-[1.01]"
          >
            Começar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="grid min-h-[760px] items-center gap-16 pb-14 pt-10 lg:grid-cols-[0.94fr_1.06fr] lg:pb-18 lg:pt-16">
          <div className="max-w-[620px]">
            <div className="animate-tp-fade-up" style={{ animationDelay: "80ms" }}>
              <h1 className="text-[3.55rem] font-medium leading-[0.94] tracking-[-0.08em] text-[#0a0a0a] sm:text-[4.8rem] lg:text-[5.85rem]">
                A operação
                <br />
                da sua agência.
                <br />
                <span className="text-[#fe6708]">Reinventada.</span>
              </h1>
            </div>

            <div
              className="animate-tp-fade-up mt-10 flex items-start gap-5 text-[1.55rem] font-normal leading-[1.4] tracking-[-0.04em] text-[#6a6a6a]"
              style={{ animationDelay: "160ms" }}
            >
              <span className="mt-1 h-16 w-px bg-[#ff8d4a]" />
              <div>
                <p>Converse.</p>
                <p>Nós executamos.</p>
              </div>
            </div>

            <div className="animate-tp-fade-up mt-11" style={{ animationDelay: "240ms" }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full bg-[#050608] px-7 py-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-transform duration-200 hover:scale-[1.01]"
              >
                Experimentar gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-4 pl-7 text-sm text-[#8e8e8e]">7 dias grátis. Sem cartão de crédito.</p>
            </div>
          </div>

          <div className="animate-tp-fade-up lg:pl-6" style={{ animationDelay: "220ms" }}>
            <HeroSymbol />
          </div>
        </section>

        <section id="como-funciona" className="pb-20">
          <div className="animate-tp-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="grid gap-4 lg:grid-cols-[0.6fr_2fr]">
              <VideoPlaceholder />
              <ChatShowcase />
            </div>
          </div>
        </section>

        <section className="pb-24 pt-8 text-center sm:pb-28">
          <div className="animate-tp-fade-up" style={{ animationDelay: "120ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">Simples assim</p>
            <h2 className="mx-auto mt-5 max-w-[940px] text-[2.55rem] font-medium leading-[1.02] tracking-[-0.07em] text-[#0a0a0a] sm:text-[3.9rem] lg:text-[4.6rem]">
              Enquanto você conversa,
              <br />
              <span className="text-[#fe6708]">tudo acontece.</span>
            </h2>
          </div>
        </section>

        <section id="para-agencias" className="pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-[0.72fr_1.55fr]">
            <div className="animate-tp-fade-up max-w-[330px]" style={{ animationDelay: "100ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">Tudo organizado</p>
              <h2 className="mt-6 text-[2.5rem] font-medium leading-[1.04] tracking-[-0.06em] text-[#0a0a0a] sm:text-[3.45rem]">
                Informação
                <br />
                em tempo real.
                <br />
                Decisões melhores.
              </h2>
              <p className="mt-6 max-w-[280px] text-[1.15rem] leading-8 tracking-[-0.03em] text-[#7d7d7d]">
                Acompanhe clientes, viagens, financeiro e documentos sempre atualizados.
              </p>
            </div>

            <div className="animate-tp-fade-up" id="recursos" style={{ animationDelay: "180ms" }}>
              <DashboardShowcase />
            </div>
          </div>
        </section>

        <section id="precos" className="pb-14 pt-4 text-center">
          <div className="animate-tp-fade-up" style={{ animationDelay: "100ms" }}>
            <h2 className="mx-auto max-w-[820px] text-[2.7rem] font-medium leading-[1.02] tracking-[-0.07em] text-[#0a0a0a] sm:text-[4rem] lg:text-[4.8rem]">
              Pronto para transformar
              <br />
              a operação da sua agência?
            </h2>
            <p className="mt-5 text-[1.08rem] text-[#8a8a8a]">Comece agora gratuitamente por 7 dias.</p>
            <div className="mt-9">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#ff7a1a_0%,#fe6708_100%)] px-10 py-4 text-base font-medium text-white shadow-[0_22px_44px_rgba(254,103,8,0.18)] transition-transform duration-200 hover:scale-[1.01]"
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm text-[#9b9b9b]">Sem cartão de crédito. Cancelamento fácil.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
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
  { label: "Para agencias", href: "#para-agencias" },
  { label: "Recursos", href: "#recursos" },
  { label: "Precos", href: "#precos" },
]

const sidebarItems = [
  { label: "Conversas", icon: MessageSquare, active: true },
  { label: "Clientes", icon: Users },
  { label: "Viagens", icon: Plane },
  { label: "Financeiro", icon: Wallet },
  { label: "Documentos", icon: FileText },
  { label: "Historico", icon: History },
]

const executionItems = [
  { label: "Clientes", detail: "2 criados", icon: Users },
  { label: "Viagem", detail: "1 criada", icon: Plane },
  { label: "Financeiro", detail: "iniciado", icon: Wallet },
  { label: "Documentos", detail: "2 vinculados", icon: FileText },
  { label: "Historico", detail: "atualizado", icon: History },
]

const dashboardKpis = [
  { label: "Faturamento (mes)", value: "R$ 245.680,00", delta: "+ 18,2%" },
  { label: "A receber", value: "R$ 82.460,00", delta: "+ 12,3%" },
  { label: "Viagens ativas", value: "24", delta: "+ 2,4%" },
  { label: "Clientes ativos", value: "156", delta: "+ 14,6%" },
]

const recentTrips = [
  { trip: "Aruba · Jul/2025", client: "Joao da Silva e Maria", status: "Confirmada" },
  { trip: "Paris · Ago/2025", client: "Carlos e Ana", status: "Em andamento" },
  { trip: "Orlando · Set/2025", client: "Familia Gomes", status: "Confirmada" },
  { trip: "Cancun · Out/2025", client: "Luciana Matos", status: "Aguardando pagamento" },
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
      className={`relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-[linear-gradient(145deg,#ff7a1a_0%,#fe6708_100%)] shadow-[0_6px_18px_rgba(254,103,8,0.16)] ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-4.5 w-4.5 fill-white" aria-hidden="true">
        <path d="M15.2 4.6c1 0 1.8.8 1.8 1.8v4.7l7.2 4.1c.8.5 1.1 1.5.7 2.3l-.4.8c-.4.8-1.3 1.2-2.2.9L17 18v7l2.4 1.8c.5.4.7 1 .4 1.6l-.2.4c-.2.6-.8.9-1.4.9H13.8c-.6 0-1.1-.3-1.4-.9l-.2-.4c-.3-.6-.1-1.2.4-1.6L15 25v-7l-5.3 1.1c-.9.3-1.8-.1-2.2-.9l-.4-.8c-.4-.8-.1-1.8.7-2.3l7.2-4.1V6.4c0-1 .8-1.8 1.8-1.8h-.6Z" />
      </svg>
    </div>
  )
}

function HeroSymbol({ offsetX, offsetY }: { offsetX: number; offsetY: number }) {
  return (
    <div className="relative mx-auto flex aspect-[0.95/1] w-full max-w-[468px] items-end justify-center">
      <div
        className="absolute inset-x-[14%] bottom-[3%] h-12 rounded-full bg-[radial-gradient(circle,rgba(254,103,8,0.1)_0%,rgba(254,103,8,0.04)_38%,rgba(254,103,8,0)_76%)] blur-2xl transition-all duration-500 ease-out"
        style={{
          transform: `translate(${offsetX * 6}px, ${offsetY * 2}px) scale(${1 + Math.abs(offsetX) * 0.03})`,
        }}
      />
      <div
        className="absolute top-[12%] h-[16%] w-[19%] rounded-full bg-white/35 blur-2xl transition-all duration-500 ease-out"
        style={{
          left: `calc(22% + ${offsetX * 18}px)`,
          transform: `translateY(${offsetY * -6}px)`,
        }}
      />
      <div className="absolute inset-y-[7%] right-[11%] w-[67%] rounded-t-[38%] rounded-b-[14%] bg-[#ffc08f] opacity-20 blur-[2px]" />
      <div
        className="relative flex h-full w-[72%] min-w-[240px] items-center justify-center rounded-t-[42%] rounded-b-[14%] border border-white/28 bg-[linear-gradient(180deg,#ff941f_0%,#fe6708_100%)] transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(${offsetX * 10}px, ${offsetY * 8}px, 0)`,
          boxShadow: `${offsetX * 4}px ${22 + offsetY * 6}px ${52 + Math.abs(offsetX) * 10}px rgba(254,103,8,0.13), inset ${-10 + offsetX * 3}px 0 22px rgba(201,79,0,0.12), inset 0 1px 0 rgba(255,255,255,0.34)`,
        }}
      >
        <div
          className="absolute inset-x-[18%] top-[4%] h-[10%] rounded-full bg-white/16 blur-xl transition-all duration-500 ease-out"
          style={{ transform: `translate(${offsetX * 8}px, ${offsetY * -4}px)` }}
        />
        <div className="absolute bottom-0 left-1/2 h-[46%] w-[30%] -translate-x-1/2 rounded-t-full bg-[linear-gradient(180deg,#fff7ee_0%,#ffffff_100%)] shadow-[0_-4px_14px_rgba(255,255,255,0.14)]" />
        <svg
          viewBox="0 0 96 96"
          aria-hidden="true"
          className="relative z-10 h-[42%] w-[42%] fill-white drop-shadow-[0_10px_12px_rgba(128,48,0,0.14)]"
        >
          <path d="M46 8a4 4 0 0 1 4 4v19.2l22.2 12.6c2.1 1.2 2.9 3.8 1.8 5.9l-1 1.8c-1 2.1-3.5 3.1-5.8 2.4L50 49.6V67l8.3 6.2c1.7 1.3 2.3 3.5 1.4 5.4l-.7 1.5A4.3 4.3 0 0 1 55.2 83H40.8a4.3 4.3 0 0 1-3.8-2.9l-.7-1.5c-.9-1.9-.3-4.1 1.4-5.4L46 67V49.6l-17.2 4.3c-2.3.7-4.8-.3-5.8-2.4l-1-1.8c-1.1-2.1-.3-4.7 1.8-5.9L46 31.2V12a4 4 0 0 1 4-4Z" />
        </svg>
      </div>
    </div>
  )
}

function HeroExperience() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    setPointer({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    })
  }

  return (
    <section className="grid min-h-[840px] items-center gap-20 pb-20 pt-16 lg:grid-cols-[0.96fr_1.04fr] lg:pb-24 lg:pt-20">
      <div className="max-w-[650px]">
        <div className="space-y-2">
          <span
            className="animate-tp-hero-line block text-[3.95rem] font-medium leading-[0.92] tracking-[-0.1em] text-[#0a0a0a] sm:text-[5.2rem] lg:text-[6.45rem]"
            style={{ animationDelay: "40ms" }}
          >
            A operacao
          </span>
          <span
            className="animate-tp-hero-line block text-[3.95rem] font-medium leading-[0.92] tracking-[-0.1em] text-[#0a0a0a] sm:text-[5.2rem] lg:text-[6.45rem]"
            style={{ animationDelay: "230ms" }}
          >
            da sua agencia.
          </span>
          <span
            className="animate-tp-hero-impact block pt-2 text-[3.95rem] font-medium leading-[0.92] tracking-[-0.105em] text-[#fe6708] sm:text-[5.2rem] lg:text-[6.45rem]"
            style={{ animationDelay: "470ms" }}
          >
            Reinventada.
          </span>
        </div>

        <div
          className="animate-tp-fade-soft mt-16 flex items-start gap-5 text-[1.5rem] font-normal leading-[1.48] tracking-[-0.045em] text-[#707070]"
          style={{ animationDelay: "540ms" }}
        >
          <span className="mt-1 h-16 w-px bg-[#ff8d4a]/80" />
          <div>
            <p>Converse.</p>
            <p>Nos executamos.</p>
          </div>
        </div>

        <div className="animate-tp-fade-soft mt-16" style={{ animationDelay: "610ms" }}>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full bg-[#080a0d] px-7 py-3.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.11)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-black hover:shadow-[0_16px_30px_rgba(0,0,0,0.13)]"
          >
            Experimentar gratuitamente
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-5 pl-7 text-sm text-[#8e8e8e]">7 dias gratis. Sem cartao.</p>
        </div>
      </div>

      <div
        className="animate-tp-fade-soft lg:pl-10"
        style={{ animationDelay: "260ms" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setPointer({ x: 0, y: 0 })}
      >
        <HeroSymbol offsetX={pointer.x} offsetY={pointer.y} />
      </div>
    </section>
  )
}

function VideoPlaceholder() {
  return (
    <div className="relative flex h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#06070a_0%,#0a0c11_100%)] px-9 py-10 text-white shadow-[0_14px_38px_rgba(0,0,0,0.07)]">
      <div className="pointer-events-none absolute inset-x-[10%] top-[8%] h-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0)_72%)] blur-2xl" />
      <div className="relative">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">
          Veja na pratica
        </span>
        <h2 className="mt-7 max-w-[280px] text-[3.25rem] font-medium leading-[0.98] tracking-[-0.08em] text-white">
          Converse.
          <br />
          O TravelPro
          <br />
          executa.
        </h2>
      </div>
      <div className="relative flex items-center gap-4 pt-12">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.045] transition-all duration-300 hover:bg-white/[0.07]">
          <CirclePlay className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-white/96">Assistir video</p>
          <p className="text-[11px] text-white/46">01:32</p>
        </div>
      </div>
    </div>
  )
}

function ChatShowcase() {
  return (
    <div className="grid gap-3 rounded-[28px] bg-[#101318] p-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.08)] md:grid-cols-[0.82fr_1.55fr_0.72fr] md:p-3">
      <div className="rounded-[24px] border border-white/[0.05] bg-[linear-gradient(180deg,#181c22_0%,#13171d_100%)] p-6 text-white/74">
        <div className="flex items-center gap-3">
          <TravelProMark className="h-7 w-7 rounded-[8px]" />
          <span className="text-[15px] font-medium text-white">TravelPro</span>
        </div>
        <div className="mt-8 space-y-2.5">
          {sidebarItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-sm ${
                item.active ? "bg-white/[0.06] text-[#ff7a1a]" : "text-white/62"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 flex items-center justify-between text-sm text-white/46">
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4" />
            <span>Configuracoes</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/[0.05] bg-[linear-gradient(180deg,#15191f_0%,#12161c_100%)] p-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Conversas</span>
          <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs text-white/42">Hoje</span>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="max-w-[300px] rounded-[20px] bg-white/[0.07] px-4 py-4 text-sm leading-6 text-white/82">
            Crie uma viagem para Joao e Maria para Aruba em julho.
            <div className="mt-3 text-right text-[11px] text-white/35">11:30</div>
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <TravelProMark className="mt-2 h-8 w-8 rounded-[10px]" />
          <div className="flex-1 rounded-[22px] bg-white/[0.04] px-5 py-5 text-sm leading-7 text-white/84">
            <p>Entendi. Vou criar a viagem para Joao e Maria para Aruba em julho.</p>
            <p className="mt-3 text-white/64">Preparando tudo para voce:</p>
            <ul className="mt-4 space-y-2 text-white/80">
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Cliente criado: Joao da Silva
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Cliente criado: Maria da Silva
              </li>
              <li className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full border border-[#ff7a1a] bg-[#ff7a1a]/10" />
                Viagem criada: Aruba · Jul/2025
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
                Historico atualizado
              </li>
            </ul>
            <div className="mt-4 text-right text-[11px] text-white/35">11:31</div>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-full border border-white/[0.05] bg-black/12 px-4 py-3.5">
          <span className="flex-1 text-sm text-white/32">Digite sua mensagem...</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff7a1a] shadow-[0_8px_20px_rgba(254,103,8,0.22)]">
            <ArrowRight className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/[0.05] bg-[linear-gradient(180deg,#181c22_0%,#13171d_100%)] p-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium">Em execucao</span>
        </div>
        <div className="mt-7 space-y-3">
          {executionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-[18px] bg-white/[0.03] p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/[0.05] bg-[#1d2229]">
                <item.icon className="h-4 w-4 text-white/78" />
              </div>
              <div>
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-xs text-white/48">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-end">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
            <Circle className="h-4 w-4 fill-white/70 text-white/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardShowcase() {
  return (
    <div className="rounded-[32px] border border-black/[0.035] bg-white/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.06)] backdrop-blur-[2px] sm:p-5 lg:p-6">
      <div className="grid gap-4 md:grid-cols-[0.78fr_2fr]">
        <div className="rounded-[24px] border border-black/[0.035] bg-[#fdfcf9] p-6">
          <div className="flex items-center gap-3">
            <TravelProMark className="h-7 w-7 rounded-[8px]" />
            <span className="text-[15px] font-medium text-black">TravelPro</span>
          </div>
          <div className="mt-8 space-y-2.5">
            {sidebarItems.map((item, index) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-sm ${
                  index === 0 ? "bg-[#f6f4f0] text-[#0a0a0a]" : "text-[#767676]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{index === 0 ? "Inicio" : item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 flex items-center gap-3 text-sm text-[#8a8a8a]">
            <Settings className="h-4 w-4" />
            <span>Configuracoes</span>
          </div>
        </div>

        <div className="rounded-[24px] border border-black/[0.035] bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[1.9rem] font-medium tracking-[-0.05em] text-[#0a0a0a]">Visao geral</h3>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-black/[0.05] px-3 py-1.5 text-sm text-[#565656]">
              <span className="h-7 w-7 rounded-full bg-[linear-gradient(135deg,#f2ccb8_0%,#8c5a43_100%)]" />
              Agencia Exemplo
            </div>
          </div>

          <div className="mt-7 grid gap-3 xl:grid-cols-4">
            {dashboardKpis.map((item) => (
              <div key={item.label} className="rounded-[20px] border border-black/[0.035] bg-[#fffdfa] p-5">
                <p className="text-xs text-[#8a8a8a]">{item.label}</p>
                <p className="mt-2.5 text-[1.72rem] font-medium tracking-[-0.06em] text-[#0a0a0a]">{item.value}</p>
                <p className="mt-2 text-xs text-[#1fa66b]">{item.delta}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
            <div className="rounded-[22px] border border-black/[0.035] p-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Viagens recentes</h4>
                <BarChart3 className="h-4 w-4 text-[#b3b3b3]" />
              </div>
              <div className="mt-5 space-y-3">
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
              <div className="rounded-[22px] border border-black/[0.035] p-5">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Proximas viagens</h4>
                <div className="mt-5 space-y-3">
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

              <div className="rounded-[22px] border border-black/[0.035] p-5">
                <h4 className="text-sm font-medium text-[#0a0a0a]">Atividades recentes</h4>
                <div className="mt-5 space-y-3">
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
        <div className="absolute left-1/2 top-0 h-[760px] w-[1180px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.985)_0%,rgba(255,255,255,0.86)_32%,rgba(248,246,242,0)_72%)]" />
        <div className="absolute left-1/2 top-[120px] h-[540px] w-[840px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.022)_0%,rgba(0,0,0,0.01)_26%,rgba(248,246,242,0)_72%)] blur-3xl" />
        <div className="absolute right-[-120px] top-[220px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(254,103,8,0.055)_0%,rgba(254,103,8,0)_72%)] blur-3xl" />
        <div className="absolute left-[-120px] top-[980px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.94)_0%,rgba(248,246,242,0)_72%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-6 pb-28 pt-5 sm:px-10 lg:px-16">
        <header className="animate-tp-fade flex items-center justify-between py-2.5">
          <Link href="/" className="flex items-center gap-3">
            <TravelProMark />
            <span className="text-[1.8rem] font-medium tracking-[-0.065em] text-[#171717] sm:text-[1.9rem]">
              TravelPro
            </span>
          </Link>

          <nav className="hidden items-center gap-12 text-[14px] text-[#555555] lg:flex">
            {mainNav.map((item) => (
              <a key={item.label} href={item.href} className="transition-opacity duration-300 hover:opacity-58">
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full bg-[#0a0c10] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_18px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-black hover:shadow-[0_10px_22px_rgba(0,0,0,0.1)]"
          >
            Comecar agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <HeroExperience />

        <section id="como-funciona" className="pb-32 pt-4">
          <div className="animate-tp-fade-soft" style={{ animationDelay: "120ms" }}>
            <div className="grid gap-2 lg:-mx-3 lg:grid-cols-[0.72fr_2.28fr] lg:items-stretch">
              <VideoPlaceholder />
              <ChatShowcase />
            </div>
          </div>
        </section>

        <section className="pb-32 pt-10 text-center sm:pb-36">
          <div className="animate-tp-fade-soft" style={{ animationDelay: "120ms" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">Simples assim</p>
            <h2 className="mx-auto mt-6 max-w-[980px] text-[2.7rem] font-medium leading-[1] tracking-[-0.075em] text-[#0a0a0a] sm:text-[4.05rem] lg:text-[4.9rem]">
              Enquanto voce conversa,
              <br />
              <span className="text-[#fe6708]">tudo acontece.</span>
            </h2>
          </div>
        </section>

        <section id="para-agencias" className="pb-32">
          <div className="grid items-center gap-14 lg:grid-cols-[0.72fr_1.55fr]">
            <div className="animate-tp-fade-soft max-w-[340px]" style={{ animationDelay: "100ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff7a1a]">Tudo organizado</p>
              <h2 className="mt-7 text-[2.65rem] font-medium leading-[1.02] tracking-[-0.07em] text-[#0a0a0a] sm:text-[3.65rem]">
                Informacao
                <br />
                em tempo real.
                <br />
                Decisoes melhores.
              </h2>
              <p className="mt-7 max-w-[290px] text-[1.08rem] leading-8 tracking-[-0.03em] text-[#7d7d7d]">
                Clientes, viagens, financeiro e documentos. Sempre atualizados.
              </p>
            </div>

            <div className="animate-tp-fade-soft" id="recursos" style={{ animationDelay: "180ms" }}>
              <DashboardShowcase />
            </div>
          </div>
        </section>

        <section id="precos" className="pb-18 pt-12 text-center">
          <div className="animate-tp-fade-soft mx-auto max-w-[900px]" style={{ animationDelay: "100ms" }}>
            <h2 className="mx-auto max-w-[860px] text-[2.8rem] font-medium leading-[1] tracking-[-0.08em] text-[#0a0a0a] sm:text-[4.25rem] lg:text-[5rem]">
              A proxima geracao das agencias
              <br />
              nao opera sistemas.
              <br />
              <span className="text-[#111111]/92">Conversa com eles.</span>
            </h2>
            <p className="mt-7 text-[1.02rem] text-[#8a8a8a]">Comece com 7 dias gratis.</p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#ff7a1a_0%,#fe6708_100%)] px-9 py-3.5 text-base font-medium text-white shadow-[0_16px_34px_rgba(254,103,8,0.14)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_18px_38px_rgba(254,103,8,0.16)]"
              >
                Comecar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm text-[#9b9b9b]">Sem cartao de credito. Cancelamento facil.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

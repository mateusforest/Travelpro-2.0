import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  FileText,
  LineChart,
  MessageCircle,
  Users,
  Wallet,
} from "lucide-react"
import { Header } from "@/components/cos/header"
import { Footer } from "@/components/cos/footer"

const heroBenefits = [
  "Tudo o que sua operação precisa",
  "Em um único ambiente",
  "Com IA que entende e executa",
  "Sem planilhas espalhadas ou sistemas desconexos",
]

const capabilities = [
  {
    title: "Clientes e oportunidades",
    description:
      "Gerencie leads, clientes e oportunidades de negócios do primeiro contato ao fechamento.",
    icon: Users,
  },
  {
    title: "Financeiro e cobranças",
    description:
      "Acompanhe receitas, despesas, cobranças e recebimentos em tempo real.",
    icon: Wallet,
  },
  {
    title: "Documentos e contratos",
    description:
      "Crie, envie, assine e organize documentos e contratos de forma segura.",
    icon: FileText,
  },
  {
    title: "Tarefas e projetos",
    description:
      "Organize tarefas, projetos e entregas com prazos, responsáveis e acompanhamento.",
    icon: ClipboardList,
  },
  {
    title: "Reuniões e equipe",
    description:
      "Agende reuniões, grave, gere relatórios analíticos e acompanhe sua equipe de perto.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Relatórios e insights",
    description:
      "Tenha visão completa do seu negócio com relatórios inteligentes e personalizados.",
    icon: LineChart,
  },
]

const productViews = [
  {
    label: "VERSÃO WEB",
    description: "Converse com o COS direto do navegador e execute ações.",
    src: "/cos-operacoes-web-mockup.jpeg",
    alt: "COS Operações versão web",
    width: 1600,
    height: 765,
  },
  {
    label: "PORTAL",
    description: "Gerencie todas as áreas do seu negócio em um único lugar.",
    src: "/cos-operacoes-portal-mockup.jpeg",
    alt: "COS Operações portal",
    width: 1600,
    height: 762,
  },
]

export default function OperacoesProductPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />

      <section className="px-4 pt-28 pb-14 md:px-8 md:pt-36 md:pb-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,500px)] lg:items-center lg:gap-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              COS Operações
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-[#0a0a0a] md:text-6xl md:leading-[1.02]">
              Gerencie seu negócio por{" "}
              <span className="text-green-600">conversa.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-xl">
              O produto principal do COS para empresas que querem centralizar
              clientes, financeiro, documentos, projetos e equipe em um único
              fluxo conversacional.
            </p>

            <ul className="mt-8 space-y-4">
              {heroBenefits.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-[#0a0a0a] md:text-base">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5554999902688?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20sobre%20o%20COS%20Opera%C3%A7%C3%B5es."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-green-200 bg-white px-6 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com especialista
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[480px] lg:translate-x-2">
            <div className="absolute inset-x-10 top-12 h-[72%] rounded-full bg-[radial-gradient(circle,_rgba(34,197,94,0.12),_rgba(255,255,255,0)_72%)] blur-3xl" />
            <div className="relative">
              <Image
                src="/cos-operacoes-hero-mobile-mockup.png"
                alt="COS Operações mobile"
                width={3919}
                height={3919}
                quality={95}
                sizes="(min-width: 1280px) 500px, (min-width: 768px) 42vw, 88vw"
                priority
                className="mx-auto h-auto w-full object-contain drop-shadow-[0_26px_70px_rgba(15,23,42,0.16)]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-green-600">
              UMA OPERAÇÃO COMPLETA
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
              Tudo o que sua empresa precisa,
              <br className="hidden md:block" /> em um só lugar.
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-lg">
              Centralize processos, automatize tarefas e tenha controle total
              da sua operação com a inteligência do COS.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-border/60 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
                  <item.icon className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-[#0a0a0a]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {productViews.map((view) => (
              <div
                key={view.label}
                className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)] md:p-7"
              >
                <div className="mb-6 text-center">
                  <p className="text-sm font-semibold tracking-[0.2em] text-green-600">
                    {view.label}
                  </p>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
                    {view.description}
                  </p>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-[#fafaf8] shadow-[0_24px_80px_rgba(15,23,42,0.07)] ring-1 ring-white/70">
                  <Image
                    src={view.src}
                    alt={view.alt}
                    width={view.width}
                    height={view.height}
                    quality={95}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="h-auto w-full object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Cable,
  Database,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react"
import { Header } from "@/components/cos/header"
import { Footer } from "@/components/cos/footer"

const heroBenefits = [
  "Integração sem migração",
  "Sincronização de dados em tempo real",
  "APIs e integrações nativas",
  "Automação e consultas por conversa",
  "Mais agilidade e menos retrabalho",
]

const capabilities = [
  {
    title: "Conecte seus sistemas",
    description:
      "Integre ERPs, CRMs, planilhas, bancos de dados e muito mais.",
    icon: Cable,
  },
  {
    title: "Sincronização em tempo real",
    description:
      "Dados sempre atualizados para conversas e operações precisas.",
    icon: Database,
  },
  {
    title: "Automação inteligente",
    description:
      "Execute ações, gere insights e reduza tarefas manuais.",
    icon: Sparkles,
  },
  {
    title: "Consultar por conversa",
    description:
      "Pergunte, analise e tome decisões com linguagem natural.",
    icon: MessageCircle,
  },
  {
    title: "Seguro e confiável",
    description:
      "Seus dados protegidos com criptografia e controle de acesso.",
    icon: ShieldCheck,
  },
]

export default function ConnectProductPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />

      <section className="px-4 pt-28 pb-14 md:px-8 md:pt-36 md:pb-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,500px)] lg:items-center lg:gap-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
              COS Connect
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-[#0a0a0a] md:text-6xl md:leading-[1.02]">
              Conecte o COS aos seus{" "}
              <span className="text-violet-600">sistemas.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-xl">
              Use o COS sem migração. Conecte suas ferramentas atuais e opere
              por conversa com dados sincronizados em tempo real.
            </p>

            <ul className="mt-8 space-y-4">
              {heroBenefits.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-[#0a0a0a] md:text-base"
                >
                  <Webhook className="h-5 w-5 flex-shrink-0 text-violet-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5554999902688?text=Ol%C3%A1%2C%20quero%20falar%20com%20um%20especialista%20sobre%20o%20COS%20Connect."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-6 py-3 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com especialista
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[470px] lg:translate-x-2">
            <div className="absolute inset-x-12 top-10 h-[74%] rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.12),_rgba(255,255,255,0)_72%)] blur-3xl" />
            <div className="relative">
              <Image
                src="/cos-connect-mobile-mockup.png"
                alt="COS Connect mobile"
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
            <p className="text-sm font-semibold tracking-[0.2em] text-violet-600">
              SEM MIGRAÇÃO. SEM COMPLEXIDADE.
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0a0a0a] md:text-5xl">
              O COS se conecta.
              <br className="hidden md:block" /> Você continua operando.
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground md:text-lg">
              Conecte sistemas, planilhas, e-mails e outras ferramentas. Sem
              migração, sem retrabalho e com total segurança.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {capabilities.map((item) => (
              <div
                key={item.title}
                className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
                  <item.icon className="h-7 w-7 text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[#0a0a0a]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-border/60 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)] md:p-7">
            <div className="mb-6 text-center">
              <p className="text-sm font-semibold tracking-[0.2em] text-violet-600">
                VERSÃO WEB
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
                Converse com o COS Connect direto do navegador e execute ações
                nos seus sistemas.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-[#fafaf8] shadow-[0_24px_80px_rgba(15,23,42,0.07)] ring-1 ring-white/70">
              <Image
                src="/cos-connect-web-mockup.jpeg"
                alt="COS Connect versão web"
                width={1600}
                height={765}
                quality={95}
                sizes="(min-width: 1024px) 80vw, 100vw"
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

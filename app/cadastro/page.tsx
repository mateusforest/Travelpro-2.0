"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Layers, ArrowLeft, Check, ChevronRight } from "lucide-react"
import { AuthLayout } from "@/components/cos/auth-layout"
import { signupAction } from "@/actions/auth"
import type { WorkspaceType } from "@/lib/auth"
import { PublicAuthRouteGuard } from "@/components/auth/auth-route-guard"

type ProductType = WorkspaceType
type Step = "produto" | "conta"

const products: {
  id: ProductType
  icon: typeof Layers
  name: string
  description: string
  details: string
  cta: string
}[] = [
  {
    id: "operations",
    icon: Layers,
    name: "TravelPro Operações",
    description:
      "Sistema operacional para centralizar sua operação, equipe, clientes, financeiro, documentos e processos.",
    details:
      "O TravelPro organiza cadastros, vendas, financeiro, reuniões, documentos e relatórios em um workspace operacional.",
    cta: "Começar com Operações",
  },
]

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("produto")
  const [productType, setProductType] = useState<ProductType | null>(null)
  const [expanded, setExpanded] = useState<ProductType | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const chosenProduct = products.find((product) => product.id === productType)

  const handleSelectProduct = (id: ProductType) => {
    setProductType(id)
    setStep("conta")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!productType) {
      setError("Escolha o produto antes de continuar.")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    if (!acceptTerms) {
      setError("Você precisa aceitar os termos de uso.")
      return
    }

    startTransition(async () => {
      const result = await signupAction({
        name,
        email,
        password,
        productType,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.replace(result.redirectTo || "/app")
      router.refresh()
    })
  }

  return (
    <PublicAuthRouteGuard>
      <AuthLayout>
      <div className="flex justify-center mb-8">
        <Image
          src="/travelpro-logo-mark.png"
          alt="TravelPro"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
      </div>

      <AnimatePresence mode="wait">
        {step === "produto" && (
          <motion.div
            key="produto"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">TravelPro Operações</h1>
              <p className="text-[#737373] mt-2">Crie seu workspace operacional.</p>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5 transition-colors hover:border-[#0a0a0a]/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                      <product.icon className="w-5 h-5 text-[#0a0a0a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-[#0a0a0a]">{product.name}</h2>
                      <p className="text-sm text-[#737373] mt-1 leading-relaxed">{product.description}</p>

                      <AnimatePresence initial={false}>
                        {expanded === product.id && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-sm text-[#525252] mt-2 leading-relaxed overflow-hidden"
                          >
                            {product.details}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-4 mt-4">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectProduct(product.id)}
                          className="tp-gradient-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                        >
                          {product.cta}
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === product.id ? null : product.id)}
                          className="text-sm text-[#737373] hover:text-[#0a0a0a] transition-colors"
                        >
                          {expanded === product.id ? "Ocultar" : "Saiba mais"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-[#737373]">
              Já possui conta?{" "}
              <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </motion.div>
        )}

        {step === "conta" && (
          <motion.div
            key="conta"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => setStep("produto")}
              className="flex items-center gap-1.5 text-sm text-[#737373] hover:text-[#0a0a0a] transition-colors mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            {chosenProduct && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-[#fafafa] border border-[#e5e5e5]">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                  <chosenProduct.icon className="w-4 h-4 text-[#0a0a0a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[#0a0a0a]">{chosenProduct.name}</span>
                  <span className="block text-xs text-[#737373]">Produto selecionado</span>
                </div>
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              </div>
            )}

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">Criar conta</h1>
              <p className="text-[#737373] mt-2">Comece a operar com TravelPro.</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-[#0a0a0a]">
                  Nome completo
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-[#0a0a0a]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-[#0a0a0a]">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#0a0a0a]">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]/10 focus:border-[#0a0a0a]/20 transition-all"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]/20"
                />
                <span className="text-sm text-[#737373]">
                  Aceito os{" "}
                  <Link href="/termos" className="text-[#0a0a0a] hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href="/privacidade" className="text-[#0a0a0a] hover:underline">
                    Política de Privacidade
                  </Link>
                </span>
              </label>

              <motion.button
                type="submit"
                disabled={isPending}
                whileTap={{ scale: 0.98 }}
                className="tp-gradient-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Criar conta"}
              </motion.button>
            </form>

            <p className="mt-8 text-center text-sm text-[#737373]">
              Já possui conta?{" "}
              <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      </AuthLayout>
    </PublicAuthRouteGuard>
  )
}

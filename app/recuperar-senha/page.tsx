"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { AuthLayout } from "@/components/cos/auth-layout"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simular envio - integrar com backend real
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSuccess(true)
  }

  return (
    <AuthLayout>
      {/* Logo centralizado no card */}
      <div className="flex justify-center mb-8">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
          alt="COS"
          width={56}
          height={56}
          className="w-14 h-14"
        />
      </div>

      {isSuccess ? (
        // Estado de sucesso
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
            Instruções enviadas
          </h1>
          <p className="text-[#737373] mt-3 mb-8">
            Verifique seu email para continuar com a recuperação de senha.
          </p>
          
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3.5 px-4 bg-[#0a0a0a] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Voltar para login
          </Link>
          
          <p className="mt-6 text-sm text-[#a3a3a3]">
            Não recebeu o email?{" "}
            <button 
              onClick={() => setIsSuccess(false)}
              className="text-[#0a0a0a] font-medium hover:underline"
            >
              Tentar novamente
            </button>
          </p>
        </motion.div>
      ) : (
        // Formulário
        <>
          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[#0a0a0a] tracking-tight">
              Recuperar acesso
            </h1>
            <p className="text-[#737373] mt-2">
              Informe seu email para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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

            {/* Botão principal */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 px-4 bg-[#0a0a0a] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Enviar instruções"
              )}
            </motion.button>
          </form>

          {/* Link para voltar */}
          <p className="mt-8 text-center text-sm text-[#737373]">
            Lembrou sua senha?{" "}
            <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
              Voltar para login
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}

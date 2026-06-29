"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f3] flex flex-col lg:flex-row">
      {/* Lado Esquerdo - Conteúdo Institucional */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#f5f5f3] to-[#e8e8e6]" />
        
        {/* Elementos decorativos sutis */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/40 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-20 w-48 h-48 bg-white/30 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12">
          {/* Logo */}
          <Link href="/" className="mb-12">
            <Image
              src="/travelpro-logo-horizontal.png"
              alt="TravelPro"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          
          {/* Headline */}
          <div className="space-y-6 max-w-xl">
            <h1 className="text-5xl xl:text-6xl font-medium tracking-tight text-[#0a0a0a] leading-[1.1]">
              <span className="italic">Sua empresa</span>
              <br />
              <span className="italic">conversa.</span>
            </h1>
            <h2 className="text-5xl xl:text-6xl font-medium tracking-tight text-[#0a0a0a] leading-[1.1]">
              O COS executa.
            </h2>
            <p className="text-lg text-[#737373] max-w-md leading-relaxed pt-4">
              Uma nova forma de operar negócios, criar softwares e conectar sistemas.
            </p>
          </div>
          
          {/* Mockup visual sutil */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mt-16 relative"
          >
            <div className="relative w-full max-w-md">
              {/* Card de conversa simulado */}
              <div className="bg-white rounded-2xl shadow-lg shadow-black/5 p-6 border border-black/5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#f5f5f3] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#0a0a0a] font-medium">Bem-vindo ao COS</p>
                    <p className="text-sm text-[#737373] mt-1">Sua operação começa com uma conversa.</p>
                  </div>
                </div>
              </div>
              
              {/* Indicadores de ação */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white rounded-xl shadow-lg shadow-black/5 px-4 py-3 border border-black/5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-[#0a0a0a] font-medium">Conectado</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Lado Direito - Card de Autenticação */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Image
                src="/travelpro-logo-horizontal.png"
                alt="TravelPro"
                width={100}
                height={33}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          
          {/* Card principal */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-black/5 p-8 md:p-10">
            {children}
          </div>
          
          {/* Footer mobile */}
          <div className="lg:hidden mt-8 text-center">
            <p className="text-sm text-[#737373]">
              Uma nova forma de operar negócios.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

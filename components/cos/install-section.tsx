"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { X, Apple, Smartphone, Monitor, Download, Share, Plus, Check } from "lucide-react"

type Platform = "ios" | "android" | "desktop" | null

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallSection() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const detectPlatform = (): Platform => {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) return "ios"
    if (/android/.test(userAgent)) return "android"
    return "desktop"
  }

  const handleInstallClick = async () => {
    const platform = detectPlatform()

    if (platform === "desktop" && deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") setIsInstalled(true)
        setDeferredPrompt(null)
      } catch {
        setSelectedPlatform("desktop")
      }
    } else {
      setSelectedPlatform(platform)
    }
  }

  return (
    <>
      <section id="instalar" className="px-4 md:px-8 lg:px-12 py-6 md:py-12">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Download className="h-3.5 w-3.5 text-white/80" />
              </div>
              <span className="text-xs text-muted-foreground">Leve o COS para sua tela inicial</span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight mb-1">
              Instale o COS.
            </h2>
            <h2 className="text-2xl font-medium tracking-tight text-muted-foreground mb-4">
              Opere como um app.
            </h2>

            <p className="text-sm text-muted-foreground mb-6">
              Acesse sua operação direto da tela inicial, no celular ou no computador.
            </p>

            {/* Install Button */}
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-white rounded-full py-3.5 px-6 font-medium mb-4"
            >
              <Download className="h-4 w-4" />
              Baixar COS
            </button>

            {/* Platform Badges */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 py-2 px-3 bg-muted rounded-full">
                <Apple className="h-4 w-4" />
                <span className="text-xs">iPhone</span>
              </div>
              <div className="flex items-center gap-1.5 py-2 px-3 bg-muted rounded-full">
                <Smartphone className="h-4 w-4" />
                <span className="text-xs">Android</span>
              </div>
              <div className="flex items-center gap-1.5 py-2 px-3 bg-muted rounded-full">
                <Monitor className="h-4 w-4" />
                <span className="text-xs">Desktop</span>
              </div>
            </div>

            {/* Benefit */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-600" />
              <span>Mais rápido. Mais prático. Sempre à mão.</span>
            </div>
          </motion.div>
        </div>

        {/* Desktop Layout - Original Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden md:block mx-auto max-w-7xl"
        >
          <div className="relative overflow-hidden rounded-3xl">
            <Image
              src="/cos-install-banner.png"
              alt="Instale o COS - Opere como um app"
              width={1672}
              height={941}
              className="w-full h-auto"
            />
            <button
              onClick={handleInstallClick}
              className="absolute left-[6%] top-[54%] md:top-[52%] w-[15%] h-[8%] opacity-0 hover:opacity-10 hover:bg-white/20 rounded-xl transition-opacity cursor-pointer"
              aria-label="Baixar COS"
            />
          </div>
        </motion.div>
      </section>

      {/* Install Modal - Premium Design */}
      <AnimatePresence>
        {selectedPlatform && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedPlatform(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-md md:w-full shadow-2xl max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedPlatform === "ios" ? "bg-neutral-900" :
                    selectedPlatform === "android" ? "bg-green-600" : "bg-blue-600"
                  }`}>
                    {selectedPlatform === "ios" && <Apple className="h-6 w-6 text-white" />}
                    {selectedPlatform === "android" && <Smartphone className="h-6 w-6 text-white" />}
                    {selectedPlatform === "desktop" && <Monitor className="h-6 w-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedPlatform === "ios" && "iPhone"}
                      {selectedPlatform === "android" && "Android"}
                      {selectedPlatform === "desktop" && "Desktop"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Como instalar</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlatform(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isInstalled ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium">COS já está instalado!</p>
                  <p className="text-muted-foreground mt-2">Abra pela tela inicial.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPlatform === "ios" && (
                    <>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Toque no botão Compartilhar</p>
                          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                            <Share className="h-4 w-4" />
                            <span className="text-sm">Na barra do Safari</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">{`Escolha "Adicionar à Tela de Início"`}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Role para encontrar</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">{`Confirme em "Adicionar"`}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            O COS aparecerá na sua tela inicial
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedPlatform === "android" && (
                    <>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Toque em Instalar</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Procure o banner ou menu do navegador
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Confirme a instalação</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Toque em instalar no popup
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Abra o COS</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            O ícone estará na sua tela inicial
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedPlatform === "desktop" && (
                    <>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Clique em Instalar</p>
                          <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                            <Download className="h-4 w-4" />
                            <span className="text-sm">Na barra de endereço</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Confirme no navegador</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Clique em instalar no popup
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-[15px]">Acesse o COS</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Disponível como aplicativo
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelectedPlatform(null)}
                className="w-full mt-6 py-3.5 rounded-full bg-foreground text-white font-medium"
              >
                Entendi
              </button>
              
              {/* Bottom Indicator */}
              <div className="w-32 h-1 bg-muted rounded-full mx-auto mt-4 md:hidden" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

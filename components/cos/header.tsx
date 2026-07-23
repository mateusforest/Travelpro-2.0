"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, Menu, X } from "lucide-react"

const navItems = [
  { label: "Conhecer", href: "#como-funciona" },
  { label: "Produtos", href: "#produtos" },
  { label: "Empresas", href: "#empresas" },
  { label: "Instalar", href: "#instalar" },
  { label: "Contato", href: "#contato" },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false)
    if (pathname !== "/") {
      router.push(`/${href}`)
      return
    }

    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 md:px-6 md:pt-6">
      <nav
        className={`mx-auto max-w-5xl rounded-2xl border border-white/20 px-3 py-2 md:px-6 md:py-4 transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5"
            : "bg-white/60 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo - Mobile: larger and more prominent */}
          <Link href="/" className="flex items-center">
            <Image
              src="/travelpro-logo-horizontal.png"
              alt="TravelPro"
              width={100}
              height={32}
              className="h-6 w-auto md:h-8"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile: CTA Button + Menu */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/cadastro"
              className="tp-gradient-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium"
            >
              Começar
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Desktop CTA Button */}
          <div className="hidden md:block">
            <Link
              href="/cadastro"
              className="tp-gradient-btn inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile Menu - Premium Apple-style */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-border/30">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.href)}
                  className="text-left text-[15px] text-foreground/80 hover:text-foreground transition-colors py-2.5 px-1 rounded-lg hover:bg-muted/50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

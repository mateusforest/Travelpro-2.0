"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

const footerLinks = [
  { label: "Produtos", href: "#produtos" },
  { label: "Documentacao", href: "doc-soon" },
  { label: "Contato", href: "#contato" },
  { label: "Termos de Uso", href: "/termos" },
  { label: "Politica de Privacidade", href: "/privacidade" },
]

export function Footer() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLink = (href: string) => {
    if (href === "doc-soon") {
      toast({
        title: "Documentacao disponivel em breve.",
        description: "A documentacao publica do TravelPro sera disponibilizada em breve.",
      })
      return
    }

    if (href.startsWith("/")) {
      router.push(href)
      return
    }

    if (href.startsWith("#")) {
      if (pathname !== "/") {
        router.push(`/${href}`)
        return
      }

      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <footer id="contato" className="px-4 py-12 md:px-8 md:py-16 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/travelpro-logo-mark.png"
            alt="TravelPro"
            width={60}
            height={60}
            className="h-14 w-14 md:h-16 md:w-16"
          />

          <p className="mt-6 text-sm text-muted-foreground">TravelPro</p>

          <nav className="mt-8 flex flex-wrap justify-center gap-6 md:gap-8">
            {footerLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleLink(link.href)}
                  className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                >
                  {link.label}
                </button>
              ),
            )}
          </nav>

          <div className="mt-10 w-full max-w-md border-t border-border/50" />

          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} TravelPro. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

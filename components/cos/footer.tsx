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
        description: "A documentacao publica do COS sera disponibilizada em breve.",
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
    <footer id="contato" className="px-4 md:px-8 lg:px-12 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
            alt="COS"
            width={60}
            height={60}
            className="h-14 w-14 md:h-16 md:w-16 invert"
          />

          <p className="mt-6 text-sm text-muted-foreground">
            Conversational Operating System
          </p>

          <nav className="mt-8 flex flex-wrap justify-center gap-6 md:gap-8">
            {footerLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleLink(link.href)}
                  className="text-sm text-foreground/70 hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ),
            )}
          </nav>

          <div className="mt-10 w-full max-w-md border-t border-border/50" />

          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} COS. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

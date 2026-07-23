import { Header } from "@/components/cos/header"
import { HeroSection } from "@/components/cos/hero-section"
import { VisionSection } from "@/components/cos/vision-section"
import { HowItWorksSection } from "@/components/cos/how-it-works-section"
import { ProductsSection } from "@/components/cos/products-section"
import { CompaniesSection } from "@/components/cos/companies-section"
import { InstallSection } from "@/components/cos/install-section"
import { CTASection } from "@/components/cos/cta-section"
import { Footer } from "@/components/cos/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <Header />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Vision / Manifesto Section */}
      <VisionSection />
      
      {/* How It Works Section */}
      <HowItWorksSection />
      
      {/* Products Section */}
      <ProductsSection />
      
      {/* Companies Section */}
      <CompaniesSection />
      
      {/* Install Section */}
      <InstallSection />
      
      {/* CTA Section */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </main>
  )
}

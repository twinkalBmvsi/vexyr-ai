import Nav from "../components/Nav";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import Features from "../components/Features";
import Pricing from "../components/Pricing";
import Modules from "../components/Modules";
import HowItWorks from "../components/HowItWorks";
import Testimonials from "../components/Testimonials";
import CTA from "../components/CTA";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <Pricing />
      <Modules />
      <HowItWorks />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  );
}

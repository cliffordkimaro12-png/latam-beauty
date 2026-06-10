import React from 'react';
import { Sparkles, ArrowRight, Sun, ShieldCheck, HeartPulse } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onBlogClick: () => void;
}

export default function Hero({ onShopClick, onBlogClick }: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-[#FDFCFB] py-16 md:py-24 lg:py-28 border-b border-[#E5E5E5]">
      {/* Large Floating Circle Background Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#F5F2ED] z-0 opacity-80 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Grid: Visual Editorial Layout (Swiss/Prada vibe) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Visual Storytelling */}
          <div className="lg:col-span-7 space-y-10 text-left">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-[#6B705C] font-bold mb-4 italic">
                The Radiance Collective
              </p>
              <h1 className="text-[52px] sm:text-[72px] lg:text-[84px] leading-[0.9] font-serif font-light mb-8 text-[#1A1A1A]">
                Pure <br/>
                <span className="italic ml-8 sm:ml-16 text-[#6B705C]">Botanical</span> <br/>
                Potency
              </h1>
              <p className="max-w-md text-[13.5px] leading-relaxed text-[#4A4A4A] mt-6 font-sans">
                Elegance meets science. Formulated with rare organic extracts and bio-active botanical complexes synthesized carefully to restore your skin's natural architecture.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-3">
              <button
                id="hero-shop-now-btn"
                onClick={onShopClick}
                className="px-10 py-4 bg-[#1A1A1A] text-white text-[11px] uppercase tracking-[0.2em] hover:bg-[#2D2D2D] transition-colors rounded-none font-medium"
              >
                Explore Collection
              </button>

              <button
                id="hero-read-blog-btn"
                onClick={onBlogClick}
                className="px-10 py-4 border border-[#1A1A1A] text-[#1A1A1A] text-[11px] uppercase tracking-[0.2em] hover:bg-[#1A1A1A] hover:text-white transition-all rounded-none font-medium bg-transparent"
              >
                Wellness Journal
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-[#E5E5E5]">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B705C]">
                  <Sun className="w-4 h-4 text-[#6B705C]" />
                  <span className="font-serif text-sm italic font-medium tracking-wide">100% Organic</span>
                </div>
                <p className="text-[11px] text-[#4A4A4A] leading-relaxed">Certified ECOCERT bio-extracts only.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B705C]">
                  <ShieldCheck className="w-4 h-4 text-[#6B705C]" />
                  <span className="font-serif text-sm italic font-medium tracking-wide">Non-Toxic Labs</span>
                </div>
                <p className="text-[11px] text-[#4A4A4A] leading-relaxed">Tested clinical formulations.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-[#6B705C]">
                  <HeartPulse className="w-4 h-4 text-[#6B705C]" />
                  <span className="font-serif text-sm italic font-medium tracking-wide">Zero Additives</span>
                </div>
                <p className="text-[11px] text-[#4A4A4A] leading-relaxed">Free of phthalates or mineral fillers.</p>
              </div>
            </div>

          </div>

          {/* Right Column: Product Spotlight / Imagery */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Soft decorative visual block frame */}
            <div className="relative w-full max-w-sm aspect-[4/5] bg-[#F5F2ED] border border-[#E5E5E5] p-5 group">
              <div className="relative w-full h-full bg-white overflow-hidden border border-[#E5E5E5]">
                <img
                  src="https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800&auto=format&fit=crop"
                  alt="Latam Natural Apothecary Skincare Elixir Bottles"
                  className="w-full h-full object-cover grayscale-[15%] group-hover:scale-105 transition-transform duration-[4000ms]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Overlapping Slogan Overlay */}
                <div className="absolute bottom-5 left-5 right-5 bg-[#FDFCFB]/95 border border-[#E5E5E5] p-4 backdrop-blur">
                  <p className="font-serif italic text-xs text-[#1A1A1A] leading-relaxed">
                    "Let your skin breathe botanical serenity. Real luxurious chemistry derived purely from organic botanical seeds."
                  </p>
                  <div className="mt-2 flex justify-between items-center text-[9px] tracking-widest uppercase text-[#6B705C] font-semibold">
                    <span>Latam Natural</span>
                    <span className="font-mono">Est. 2026</span>
                  </div>
                </div>
              </div>

              {/* Vertical Side Label */}
              <div className="absolute -right-24 top-1/2 -translate-y-1/2 rotate-90 origin-left text-[8.5px] uppercase tracking-[0.5em] text-[#A1A1A1] whitespace-nowrap pointer-events-none hidden xl:block">
                Total Beauty &amp; Wellness
              </div>
            </div>

            {/* Stamp of Authenticity */}
            <div className="absolute -bottom-4 -left-4 hidden md:block w-28 h-28 border border-[#E5E5E5] bg-[#FDFCFB] p-1.5 shadow-sm">
              <div className="w-full h-full border border-dashed border-[#E5E5E5] flex flex-col items-center justify-center p-1 text-center">
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#6B705C] leading-none">ECO-AGREED</span>
                <span className="font-serif italic text-[11px] text-[#1A1A1A] mt-1">100% Native</span>
                <span className="text-[8px] text-[#A1A1A1] mt-1 font-mono">Formulation</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

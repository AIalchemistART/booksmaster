"use client";

import { Heart, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SupportCTA() {
  return (
    <div className="relative group">
      {/* Animated background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse" />
      
      {/* Main CTA card */}
      <Link
        href="https://ai-alchemist.netlify.app/donate"
        target="_blank"
        rel="noopener noreferrer"
        className="relative block"
      >
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl p-8 overflow-hidden group-hover:border-purple-500/50 transition-all duration-300">
          {/* Sparkle effects */}
          <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <div className="absolute bottom-4 left-4 opacity-30 group-hover:opacity-70 transition-opacity">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>
          
          {/* Content */}
          <div className="relative text-center">
            {/* Heart icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 mb-4 group-hover:scale-110 transition-transform duration-300">
              <Heart className="w-8 h-8 text-rose-400 group-hover:fill-rose-400 transition-all duration-300" />
            </div>
            
            {/* Heading */}
            <h3 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-rose-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Support Booksmaster
            </h3>
            
            {/* Description */}
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              If Booksmaster saves you <span className="text-white font-semibold">$100 at tax time</span>, 
              consider donating <span className="text-white font-semibold">$10</span> to keep it free and open source.
            </p>
            
            {/* CTA Button */}
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-500 rounded-xl font-semibold text-white group-hover:gap-4 transition-all duration-300 shadow-lg shadow-purple-500/50 group-hover:shadow-purple-500/70">
              <span>Support Development</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
            
            {/* Subtitle */}
            <p className="text-xs text-gray-500 mt-4">
              💫 Sustained by community support, built with ❤️
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

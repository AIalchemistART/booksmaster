'use client'

import { useEffect, useState } from 'react'
import { X, Heart, ExternalLink, Github, Coffee } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  variant: 'welcome' | 'level7'
}

export function DonationModal({ isOpen, onClose, variant }: DonationModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(onClose, 300)
  }

  const openLink = (url: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.openExternal(url)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-purple-900/95 to-purple-950/95 border-2 border-gold/50 rounded-2xl shadow-[0_0_60px_rgba(212,175,55,0.4)] transition-transform duration-300 ${
          isAnimating ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-parchment/10 border border-gold/30 rounded-lg text-parchment hover:bg-parchment/20 hover:border-gold transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-pulse">
              {variant === 'welcome' ? '📖' : '🎉'}
            </div>
            <h2 className="text-3xl font-cinzel font-bold text-parchment mb-2">
              {variant === 'welcome' ? (
                <>Welcome to <span className="text-gold">Booksmaster</span></>
              ) : (
                <>You've Reached <span className="text-gold">Level 7!</span></>
              )}
            </h2>
            <p className="text-silver text-base">
              {variant === 'welcome' 
                ? 'Thank you for choosing Booksmaster!'
                : 'You\'re mastering bookkeeping like a pro!'}
            </p>
          </div>

          {/* Message Box */}
          <div className="mb-6">
            <div className="p-5 rounded-xl bg-gold/10 border-2 border-gold/40">
              <div className="flex items-start gap-3 mb-3">
                <Heart className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-cinzel text-lg text-gold font-semibold mb-2">
                    {variant === 'welcome' ? 'Free & Community-Sustained' : 'Thank You for Your Support'}
                  </h3>
                  <p className="text-silver text-sm leading-relaxed">
                    {variant === 'welcome' ? (
                      <>
                        Booksmaster is <strong className="text-parchment">100% free and open source</strong> under the MIT License. 
                        No subscriptions, no paywalls—ever. This project is sustained by community donations. 
                        If Booksmaster saves you money at tax time, please consider donating to keep it free for everyone.
                      </>
                    ) : (
                      <>
                        By reaching Level 7, you've shown real commitment to organized bookkeeping. If Booksmaster 
                        has saved you time and money, <strong className="text-parchment">please consider supporting development</strong> with 
                        a donation. Every contribution helps fund new features, bug fixes, and hosting costs to keep the app free for everyone.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Donation Options */}
          <div className="space-y-3 mb-6">
            <h3 className="text-center text-parchment font-semibold mb-4">Support Development</h3>
            
            {/* GitHub Sponsors */}
            <button
              onClick={() => openLink('https://github.com/sponsors/AIalchemistART')}
              className="w-full p-4 rounded-lg bg-parchment/10 border-2 border-purple-500/40 hover:border-purple-500 hover:bg-parchment/15 transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                <Github className="w-5 h-5 text-purple-300" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-parchment font-semibold">GitHub Sponsors</div>
                <div className="text-silver text-xs">Monthly or one-time support</div>
              </div>
              <ExternalLink className="w-4 h-4 text-silver group-hover:text-parchment transition-colors" />
            </button>

            {/* Ko-fi */}
            <button
              onClick={() => openLink('https://ko-fi.com/aialchemistart')}
              className="w-full p-4 rounded-lg bg-parchment/10 border-2 border-[#FF5E5B]/40 hover:border-[#FF5E5B] hover:bg-parchment/15 transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-[#FF5E5B]/20 group-hover:bg-[#FF5E5B]/30 transition-colors">
                <Coffee className="w-5 h-5 text-[#FF5E5B]" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-parchment font-semibold">Ko-fi</div>
                <div className="text-silver text-xs">Buy me a coffee ☕</div>
              </div>
              <ExternalLink className="w-4 h-4 text-silver group-hover:text-parchment transition-colors" />
            </button>

            {/* PayPal */}
            <button
              onClick={() => openLink('https://paypal.me/aialchemistart')}
              className="w-full p-4 rounded-lg bg-parchment/10 border-2 border-blue-500/40 hover:border-blue-500 hover:bg-parchment/15 transition-all group flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852a.932.932 0 0 1 .922-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.72-4.428z" className="text-blue-400"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-parchment font-semibold">PayPal</div>
                <div className="text-silver text-xs">One-time donation</div>
              </div>
              <ExternalLink className="w-4 h-4 text-silver group-hover:text-parchment transition-colors" />
            </button>
          </div>

          {/* Footer note */}
          <div className="text-center text-silver text-xs mb-6">
            <p>You can find donation links anytime in <strong className="text-parchment">Settings → Support Development</strong></p>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-gold via-yellow-500 to-gold hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] text-purple-900 font-semibold py-3"
          >
            {variant === 'welcome' ? 'Continue to Setup' : 'Continue Leveling Up'}
          </Button>
        </div>
      </div>
    </div>
  )
}

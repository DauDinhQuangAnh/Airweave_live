import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Sparkles, Route, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BetaWelcomePopupProps {
  lang: 'vi' | 'en';
  onClose: () => void;
}

const BetaWelcomePopup = ({ lang, onClose }: BetaWelcomePopupProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-8 text-center">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-8 w-20 h-20 rounded-full bg-white blur-2xl" />
              <div className="absolute bottom-4 right-8 w-32 h-32 rounded-full bg-white blur-3xl" />
            </div>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            >
              <Crown className="w-12 h-12 text-white mx-auto mb-3" />
            </motion.div>
            <h2 className="font-heading text-2xl font-extrabold text-white">🎉 {lang === 'vi' ? 'Chúc mừng!' : 'Congratulations!'}</h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm font-body text-foreground leading-relaxed mb-5">
              {lang === 'vi'
                ? 'Chào mừng bạn đến với AirWeave! Trong giai đoạn Beta, tài khoản của bạn đã được nâng cấp đặc quyền Premium miễn phí để trải nghiệm toàn bộ tính năng Bản sao số & Lộ trình sạch.'
                : 'Welcome to AirWeave! During our Beta phase, your account has been upgraded to Premium for free, unlocking Air Twin & Smart Route features.'}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: Sparkles, label: lang === 'vi' ? 'AI Insight' : 'AI Insight' },
                { icon: Route, label: lang === 'vi' ? 'Lộ trình sạch' : 'Smart Route' },
                { icon: Building2, label: lang === 'vi' ? 'Air Twin' : 'Air Twin' },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <f.icon className="w-5 h-5 text-amber-500" />
                  <span className="text-[10px] font-heading font-semibold text-foreground">{f.label}</span>
                </div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full font-heading font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
              {lang === 'vi' ? 'Bắt đầu khám phá' : 'Start Exploring'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BetaWelcomePopup;

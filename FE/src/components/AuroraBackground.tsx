import { useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/use-theme';

const AuroraBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isDashboardRoute = typeof window !== 'undefined' && window.location.pathname === '/dashboard';

  useEffect(() => {
    if (isDashboardRoute) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let paused = document.hidden;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; opacity: number }[] = [];
    const colors = ['#00d4aa', '#0ea5e9', '#7c3aed', '#f59e0b'];

    // Detect mobile / low-end / reduced motion to lower GPU/CPU cost
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 4 || (navigator as any).deviceMemory <= 4;
    const particleCount = prefersReducedMotion || lowEnd ? 0 : isMobile ? 6 : 18;
    // Throttle to ~30fps to halve GPU/CPU load
    let lastDraw = 0;
    const frameInterval = 1000 / 30;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const stop = () => {
      paused = true;
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    const start = () => {
      if (prefersReducedMotion || animId !== null) return;
      paused = false;
      animId = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 2.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: isDark ? Math.random() * 0.35 + 0.05 : Math.random() * 0.2 + 0.03,
      });
    }

    const draw = (ts?: number) => {
      if (paused) {
        animId = null;
        return;
      }
      const now = ts ?? performance.now();
      if (now - lastDraw < frameInterval) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    if (particleCount > 0) start();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isDark, isDashboardRoute]);

  const blobOpacity = isDark ? 1 : 0.5;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ contain: 'strict' }}>
      {/* Aurora blobs — radial gradients are much cheaper than blur() filters */}
      {!isDashboardRoute && <div className="absolute top-0 left-0 w-[420px] h-[420px] md:w-[600px] md:h-[600px] rounded-full" style={{ background: `radial-gradient(circle, rgba(0,212,170,${isDark ? 0.10 : 0.05}) 0%, transparent 70%)`, opacity: blobOpacity }} />}
      {!isDashboardRoute && <div className="absolute top-0 right-0 w-[380px] h-[380px] md:w-[500px] md:h-[500px] rounded-full" style={{ background: `radial-gradient(circle, rgba(14,165,233,${isDark ? 0.09 : 0.04}) 0%, transparent 70%)`, opacity: blobOpacity }} />}
      {!isDashboardRoute && <div className="hidden md:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full" style={{ background: `radial-gradient(circle, rgba(124,58,237,${isDark ? 0.07 : 0.035}) 0%, transparent 70%)`, opacity: blobOpacity }} />}
      {/* Particles */}
      {!isDashboardRoute && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
    </div>
  );
};

export default AuroraBackground;

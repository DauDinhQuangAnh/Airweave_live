import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bot, X, Send, Loader2, Minus, GripHorizontal } from 'lucide-react';
import { aiApi } from '@/integrations/api';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingAIChatProps {
  lang: 'vi' | 'en';
  context?: {
    location?: string;
    aqi?: number;
    pm25?: number;
    temperature?: number;
    humidity?: number;
    riskGroup?: string;
  };
  initialOpen?: boolean;
}

const BTN_POS_KEY = 'airweave_chat_btn_pos';
const PANEL_POS_KEY = 'airweave_chat_panel_pos';

const PANEL_W = 340;
const PANEL_H = 480;
const BTN_SIZE = 56;

const FloatingAIChat = ({ lang, context, initialOpen = false }: FloatingAIChatProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(initialOpen);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Nút chatbot pin cứng ở góc phải-dưới (không kéo được).
  // btnPos vẫn giữ để panel biết mở cạnh nút; tính lại theo bề rộng cửa sổ.
  const pinnedBtnPos = () =>
    typeof window === 'undefined'
      ? { x: 24, y: 24 }
      : { x: window.innerWidth - BTN_SIZE - 24, y: 24 };
  const [btnPos, setBtnPos] = useState<{ x: number; y: number }>(pinnedBtnPos);

  // Panel position { x: from-left, y: from-top } — desktop only
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem(PANEL_POS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const btnDrag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const panelDrag = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  const getPanelPosNearButton = useCallback((height = PANEL_H, position = btnPos) => {
    const gap = 12;
    const maxX = window.innerWidth - PANEL_W - 8;
    const maxY = window.innerHeight - height - 8;
    const buttonTop = window.innerHeight - position.y - BTN_SIZE;
    const openRightX = position.x + BTN_SIZE + gap;
    const openLeftX = position.x - PANEL_W - gap;
    const x = openRightX <= maxX ? openRightX : openLeftX;
    const y = buttonTop + BTN_SIZE / 2 - height / 2;

    return {
      x: Math.min(maxX, Math.max(8, x)),
      y: Math.min(maxY, Math.max(8, y)),
    };
  }, [btnPos]);

  // Giữ nút luôn dính góc phải-dưới khi đổi kích thước cửa sổ
  useEffect(() => {
    const onResize = () => setBtnPos(pinnedBtnPos());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    if (panelPos) {
      try { sessionStorage.setItem(PANEL_POS_KEY, JSON.stringify(panelPos)); } catch {}
    }
  }, [panelPos]);

  useEffect(() => {

    if (scrollRef.current && !minimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, minimized]);

  // Listen for external prompts (e.g. from SOS "AI breathing assistant")
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prompt?: string } | undefined;
      if (!isMobile) setPanelPos(getPanelPosNearButton());
      setOpen(true);
      setMinimized(false);
      if (detail?.prompt) setInput(detail.prompt);
    };
    window.addEventListener('airweave:open-ai-chat', handler as EventListener);
    return () => window.removeEventListener('airweave:open-ai-chat', handler as EventListener);
  }, [getPanelPosNearButton, isMobile]);

  // ---- Button drag handlers ----
  const onBtnPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    btnDrag.current = {
      active: true, moved: false,
      sx: e.clientX, sy: e.clientY,
      ox: btnPos.x, oy: btnPos.y,
    };
  };
  const onBtnPointerMove = (e: React.PointerEvent) => {
    const s = btnDrag.current;
    if (!s.active) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.moved && Math.hypot(dx, dy) > 5) s.moved = true;
    if (!s.moved) return;
    const maxX = window.innerWidth - BTN_SIZE - 8;
    const maxY = window.innerHeight - BTN_SIZE - 8;
    const nextPos = {
      x: Math.min(maxX, Math.max(8, s.ox + dx)),
      y: Math.min(maxY, Math.max(8, s.oy - dy)),
    };
    setBtnPos(nextPos);
    if (open && !isMobile) {
      setPanelPos(getPanelPosNearButton(minimized ? 52 : PANEL_H, nextPos));
    }
  };
  const onBtnPointerUp = (e: React.PointerEvent) => {
    const wasMoved = btnDrag.current.moved;
    btnDrag.current.active = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!wasMoved) {
      setOpen((o) => {
        const next = !o;
        if (next && !isMobile) setPanelPos(getPanelPosNearButton());
        return next;
      });
      setMinimized(false);
    }
  };
  const onBtnPointerCancel = () => {
    btnDrag.current.active = false;
  };

  // ---- Panel drag (desktop) ----
  const getInitialPanelPos = useCallback(() => {
    if (panelPos) return panelPos;
    return getPanelPosNearButton(minimized ? 52 : PANEL_H);
  }, [getPanelPosNearButton, minimized, panelPos]);

  const onPanelHeaderPointerDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const cur = getInitialPanelPos();
    panelDrag.current = {
      active: true,
      sx: e.clientX, sy: e.clientY,
      ox: cur.x, oy: cur.y,
    };
  };
  const onPanelHeaderPointerMove = (e: React.PointerEvent) => {
    const s = panelDrag.current;
    if (!s.active) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    const h = minimized ? 52 : PANEL_H;
    const maxX = window.innerWidth - PANEL_W - 8;
    const maxY = window.innerHeight - h - 8;
    setPanelPos({
      x: Math.min(maxX, Math.max(8, s.ox + dx)),
      y: Math.min(maxY, Math.max(8, s.oy + dy)),
    });
  };
  const onPanelHeaderPointerUp = (e: React.PointerEvent) => {
    panelDrag.current.active = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);
    try {
      const data = await aiApi.chat({ lang, messages: allMessages, context });
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || '...' }]);
    } catch (e: any) {
      console.error('AI Chat error:', e);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: lang === 'vi'
            ? '⚠️ Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.'
            : '⚠️ Sorry, I cannot respond right now. Please try again later.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Compute panel style
  const panelStyle: React.CSSProperties = isMobile
    ? {
        left: 0, right: 0, bottom: 0,
        width: '100vw',
        maxHeight: '85vh',
        borderRadius: '20px 20px 0 0',
      }
    : (() => {
        const p = getInitialPanelPos();
        return {
          left: p.x, top: p.y,
          width: PANEL_W,
          height: minimized ? 'auto' : PANEL_H,
        };
      })();

  const content = (
    <>
      {/* Floating button — pin cứng góc phải-dưới, click để mở */}
      <button
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next && !isMobile) setPanelPos(getPanelPosNearButton());
            return next;
          });
          setMinimized(false);
        }}
        style={{ right: 24, bottom: 24, zIndex: 46 }}
        className="fixed w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95 flex items-center justify-center transition cursor-pointer select-none"
        aria-label="AI Assistant"
      >
        {open && !minimized ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-primary animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat panel — portal'd, fixed, draggable on desktop, bottom-sheet on mobile */}
      {open && (
        <div
          role="dialog"
          aria-label="AirWeave AI"
          style={{
            position: 'fixed',
            zIndex: 45,

            pointerEvents: 'auto',
            ...panelStyle,
          }}
          className="flex flex-col overflow-hidden bg-card/95 backdrop-blur-xl border border-cyan-400/20 shadow-2xl rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
        >
          {/* Header — drag handle on desktop */}
          <div
            onPointerDown={onPanelHeaderPointerDown}
            onPointerMove={onPanelHeaderPointerMove}
            onPointerUp={onPanelHeaderPointerUp}
            style={{ touchAction: isMobile ? 'auto' : 'none' }}
            className={`px-4 py-3 border-b border-border bg-gradient-to-r from-[#0a1f3d]/80 to-[#020617]/80 flex items-center gap-2 select-none ${
              isMobile ? '' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            {!isMobile && <GripHorizontal className="w-4 h-4 text-cyan-300/60 shrink-0" />}
            {isMobile && <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto absolute left-0 right-0 -top-0" />}
            <Bot className="w-5 h-5 text-cyan-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-bold text-[#F5F7FA] truncate">AirWeave AI</p>
              <p className="text-[10px] text-[#CBD5E1] font-body truncate">
                {lang === 'vi' ? 'Trợ lý không khí thông minh' : 'Smart air quality assistant'}
              </p>
            </div>
            {!isMobile && (
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(m => !m); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1.5 rounded-md hover:bg-white/10 text-[#CBD5E1]"
                aria-label="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md hover:bg-white/10 text-[#CBD5E1]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[180px]">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground font-body">
                      {lang === 'vi'
                        ? '🤖 Xin chào! Hỏi tôi bất kỳ điều gì về chất lượng không khí, sức khỏe, hoặc gợi ý bảo vệ hô hấp.'
                        : '🤖 Hi! Ask me anything about air quality, health, or respiratory protection tips.'}
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-sm font-body leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t border-border bg-card/80" style={{ paddingBottom: isMobile ? 'max(0.5rem, env(safe-area-inset-bottom))' : undefined }}>
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={lang === 'vi' ? 'Hỏi về chất lượng không khí...' : 'Ask about air quality...'}
                    className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-cyan-400/40"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default FloatingAIChat;

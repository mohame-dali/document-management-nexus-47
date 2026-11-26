import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/i18n/useDirection';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  X,
  RotateCcw,
  Send,
  FileText,
  ExternalLink,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { askAIAssistant, ChatSource } from '@/services/aiChatService';
import { formatShortDate, formatTime } from '@/utils/formatDate';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: number;
  isError?: boolean;
}

const STORAGE_KEY = 'ai_chat_history_v1';

const ICON_SIZE = 56;
const DEFAULT_WIDTH_MOBILE = 380;
const DEFAULT_WIDTH_SM = 420;
const EXPANDED_WIDTH = 680;
const COLLAPSED_HEIGHT = 600;
const EXPANDED_HEIGHT = 760;
const MARGIN = 16;
const GAP = 8;
const DEFAULT_BOTTOM_Y = 104;
const DEFAULT_END_X = 24;

function isDocumentDetailRoute(pathname: string): boolean {
  if (/\/(create|edit)\/?$/.test(pathname)) return false;
  return /^\/dashboard\/(?:mail\/|documents\/)?(incoming|outgoing)(?:-documents)?\/[^/]+\/?$/.test(
    pathname
  );
}

function getContextualPrompts(pathname: string, lang: string): string[] {
  const isFr = lang.startsWith('fr');

  if (isDocumentDetailRoute(pathname)) {
    return isFr
      ? [
          'Résumer ce document et extraire les points clés',
          'Quels sont les délais et engagements mentionnés dans ce dossier ?',
          'Rechercher les correspondances liées au même sujet',
        ]
      : [
          'تلخيص هذه الوثيقة واستخراج النقاط الأساسية',
          'ما هي الآجال والالتزامات المذكورة في هذا الملف؟',
          'البحث عن مراسلات سابقة مرتبطة بنفس الموضوع',
        ];
  }

  if (/\/(mail\/folders|folders)\b/.test(pathname)) {
    return isFr
      ? [
          'Rechercher les documents archivés par année ou expéditeur',
          'Quelles correspondances concernent les projets en cours ?',
          'Lister les notes et rapports classés récemment',
        ]
      : [
          'البحث عن الوثائق المؤرشفة حسب السنة أو الجهة المرسلة',
          'ما هي المراسلات المرتبطة بملفات المشاريع الجارية؟',
          'استخراج قائمة المذكرات والتقارير المصنفة حديثاً',
        ];
  }

  if (/\/(hr|profile)\b/.test(pathname)) {
    return isFr
      ? [
          'Rechercher les notes administratives sur les congés et absences',
          'Correspondances et décisions RH et demandes de stage',
          'Documents liés aux affectations et missions du personnel',
        ]
      : [
          'البحث عن المذكرات الإدارية الخاصة بالعطل والغيابات',
          'مراسلات وقرارات الموارد البشرية وطلبات التربص',
          'الوثائق المتعلقة بالتعيينات والتكليفات الإدارية',
        ];
  }

  if (/\/(mail|incoming-documents|outgoing-documents|advanced-search|scan)\b/.test(pathname)) {
    return isFr
      ? [
          'Quels courriers entrants nécessitent un suivi urgent ?',
          'Résumé des dernières correspondances de cette année',
          'Rechercher les factures, contrats et marchés enregistrés',
        ]
      : [
          'ما هي المراسلات الواردة العاجلة أو التي تتطلب متابعة؟',
          'ملخص أحدث المراسلات الصادرة والواردة هذا العام',
          'البحث عن الفواتير والعقود والصفقات المسجلة',
        ];
  }

  return isFr
    ? [
        'Résumer les principales correspondances récentes',
        'Rechercher les courriers urgents ou en attente de réponse',
        'Rechercher les factures STEG et projets 2025–2026',
      ]
    : [
        'تلخيص أهم المراسلات الواردة خلال الفترة الأخيرة',
        'البحث عن المراسلات العاجلة أو التي تنتظر رداً',
        'البحث عن مشاريع 2025–2026 وفواتير STEG',
      ];
}

export const FloatingAIChat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { dir } = useDirection();
  const { currentUser } = useAuth();

  const currentLang = i18n.language || 'ar';
  const isFr = currentLang.startsWith('fr');

  const suggestedQueries = useMemo(
    () => getContextualPrompts(location.pathname, currentLang),
    [location.pathname, currentLang]
  );

  const scopeLabel = useMemo(() => {
    if (!currentUser) return t('ai.assistant.scopeActive');
    if (['Admin', 'Director', 'AdminTuningDesk'].includes(currentUser.role)) {
      return t('ai.assistant.scopeAll');
    }
    if (currentUser.activeDepartment?.name) {
      return `${t('ai.assistant.scopeDepartment')} ${currentUser.activeDepartment.name}`;
    }
    return t('ai.assistant.scopeActive');
  }, [currentUser, t]);

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('ai_chat_position');
      if (saved) {
        const p = JSON.parse(saved);
        return {
          x: Math.max(MARGIN, Math.min(window.innerWidth - ICON_SIZE - MARGIN, p.x)),
          y: Math.max(MARGIN, Math.min(window.innerHeight - ICON_SIZE - MARGIN, p.y)),
        };
      }
    } catch {
      // Ignore invalid stored coordinates
    }
    return { x: DEFAULT_END_X, y: DEFAULT_BOTTOM_Y };
  });
  const [barClearance, setBarClearance] = useState<number>(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });
  const panelHasDraggedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist chat history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save AI chat history to localStorage:', e);
    }
  }, [messages]);

  // Persist floating trigger position
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_position', JSON.stringify(position));
    } catch {
      // Ignore storage write failure
    }
  }, [position]);

  // Dynamic clearance for sticky/fixed bottom bars (e.g. AttendancePage)
  useEffect(() => {
    const measureBottomBars = () => {
      const selectors =
        '[data-sticky-validation-bar], .sticky.bottom-4, .sticky.bottom-0, .fixed.bottom-0, .fixed.bottom-4';
      const nodes = document.querySelectorAll(selectors);
      let requiredBottom = 0;

      nodes.forEach((node) => {
        if ((node as HTMLElement).closest('[data-floating-ai-chat]')) return;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const distanceFromBottom = window.innerHeight - rect.top;
        if (distanceFromBottom > 0 && distanceFromBottom < window.innerHeight * 0.45) {
          requiredBottom = Math.max(requiredBottom, Math.ceil(distanceFromBottom + 12));
        }
      });

      setBarClearance(requiredBottom);
    };

    measureBottomBars();
    const timer = window.setTimeout(measureBottomBars, 200);

    const mutationObserver = new MutationObserver(measureBottomBars);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', measureBottomBars);
    window.addEventListener('scroll', measureBottomBars, true);

    return () => {
      window.clearTimeout(timer);
      mutationObserver.disconnect();
      window.removeEventListener('resize', measureBottomBars);
      window.removeEventListener('scroll', measureBottomBars, true);
    };
  }, [location.pathname, isOpen]);

  const effectiveBottom = Math.min(
    viewportSize.height - ICON_SIZE - MARGIN,
    Math.max(position.y, barClearance)
  );

  // Intelligent viewport-clamped positioning using active expanded/collapsed size
  const getPanelPosition = () => {
    const baseWidth = isExpanded
      ? EXPANDED_WIDTH
      : viewportSize.width >= 640
      ? DEFAULT_WIDTH_SM
      : DEFAULT_WIDTH_MOBILE;
    const targetWidth = Math.min(baseWidth, viewportSize.width - 2 * MARGIN);
    const targetHeight = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

    const iconTop = viewportSize.height - effectiveBottom - ICON_SIZE;
    const iconInlineStart = viewportSize.width - position.x - ICON_SIZE;

    const openDownward = iconTop < viewportSize.height / 2;
    const alignInlineEnd = position.x < viewportSize.width / 2;

    let top: number | undefined;
    let bottom: number | undefined;
    let insetInlineStart: number | undefined;
    let insetInlineEnd: number | undefined;

    if (openDownward) {
      top = Math.max(MARGIN, iconTop + ICON_SIZE + GAP);
      bottom = undefined;
    } else {
      bottom = Math.max(MARGIN, effectiveBottom + ICON_SIZE + GAP);
      top = undefined;
    }

    if (alignInlineEnd) {
      insetInlineEnd = Math.max(
        MARGIN,
        Math.min(position.x, viewportSize.width - targetWidth - MARGIN)
      );
      insetInlineStart = undefined;
    } else {
      insetInlineStart = Math.max(
        MARGIN,
        Math.min(iconInlineStart, viewportSize.width - targetWidth - MARGIN)
      );
      insetInlineEnd = undefined;
    }

    let availableHeight: number;
    if (openDownward) {
      availableHeight = viewportSize.height - (top ?? 0) - MARGIN;
    } else {
      availableHeight = viewportSize.height - (bottom ?? 0) - MARGIN;
    }
    const maxHeight = Math.max(320, Math.min(targetHeight, availableHeight));

    return {
      top,
      bottom,
      insetInlineStart,
      insetInlineEnd,
      maxHeight,
      maxWidth: targetWidth,
    };
  };

  // Drag floating icon
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      hasDraggedRef.current = true;
      const dx = e.clientX - dragOffset.x;
      const dy = e.clientY - dragOffset.y;
      const inlineDelta = dir === 'rtl' ? dx : -dx;

      setPosition((prev) => {
        const newX = prev.x + inlineDelta;
        const newY = prev.y - dy;
        const maxX = window.innerWidth - ICON_SIZE - MARGIN;
        const maxY = window.innerHeight - ICON_SIZE - MARGIN;
        return {
          x: Math.max(MARGIN, Math.min(maxX, newX)),
          y: Math.max(MARGIN, Math.min(maxY, newY)),
        };
      });

      setDragOffset({ x: e.clientX, y: e.clientY });
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragOffset, dir]);

  // Drag panel by header
  const handlePanelDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    setIsPanelDragging(true);
    panelHasDraggedRef.current = false;
    setPanelDragOffset({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isPanelDragging) return;

    const onMove = (e: MouseEvent) => {
      panelHasDraggedRef.current = true;
      const dx = e.clientX - panelDragOffset.x;
      const dy = e.clientY - panelDragOffset.y;
      const inlineDelta = dir === 'rtl' ? dx : -dx;

      setPosition((prev) => {
        const newX = prev.x + inlineDelta;
        const newY = prev.y - dy;
        const maxX = window.innerWidth - ICON_SIZE - MARGIN;
        const maxY = window.innerHeight - ICON_SIZE - MARGIN;
        return {
          x: Math.max(MARGIN, Math.min(maxX, newX)),
          y: Math.max(MARGIN, Math.min(maxY, newY)),
        };
      });

      setPanelDragOffset({ x: e.clientX, y: e.clientY });
    };

    const onUp = () => setIsPanelDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanelDragging, panelDragOffset, dir]);

  // Clamp coordinates & update viewport size on window resize
  useEffect(() => {
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      setPosition((prev) => {
        const maxX = window.innerWidth - ICON_SIZE - MARGIN;
        const maxY = window.innerHeight - ICON_SIZE - MARGIN;
        return {
          x: Math.max(MARGIN, Math.min(maxX, prev.x)),
          y: Math.max(MARGIN, Math.min(maxY, prev.y)),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-expand textarea height up to 120px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, 120);
    el.style.height = `${Math.max(44, nextHeight)}px`;
  }, [input, isOpen, isExpanded]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend ?? input).trim();
    if (!queryText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await askAIAssistant(queryText);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.summary || t('ai.requestProcessed'),
        sources: res.sources || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      console.error('[AI Chat] Erreur:', err);
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        errorObj?.response?.data?.message || errorObj?.message || t('ai.errorMessage');

      const errorAssistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success(t('ai.assistant.clearHistory'));
  };

  const handleCopyReply = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(msgId);
      toast.success(t('ai.assistant.copied'));
      window.setTimeout(() => {
        setCopiedMessageId((prev) => (prev === msgId ? null : prev));
      }, 2000);
    } catch {
      toast.error(t('ai.assistant.copyError'));
    }
  };

  const handleNavigateToDocument = (source: ChatSource) => {
    const basePath =
      source.documentType === 'incoming'
        ? '/dashboard/mail/incoming'
        : '/dashboard/mail/outgoing';
    navigate(`${basePath}/${source.documentId}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          type="button"
          data-floating-ai-chat="true"
          onClick={() => {
            if (!hasDraggedRef.current) setIsOpen(true);
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            setPosition({ x: DEFAULT_END_X, y: DEFAULT_BOTTOM_Y });
            toast.success(t('ai.assistant.resetPosition'));
          }}
          style={{
            insetInlineEnd: `${position.x}px`,
            bottom: `${effectiveBottom}px`,
            width: `${ICON_SIZE}px`,
            height: `${ICON_SIZE}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          className="fixed z-50 rounded-full bg-[#2c5282] hover:bg-[#234269]
                     dark:bg-[#2c5282] dark:hover:bg-[#1e3a5f]
                     text-white shadow-lg flex items-center justify-center
                     ring-2 ring-white/20 dark:ring-slate-700/80
                     transition-all duration-150 select-none print:hidden
                     focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2c5282] focus-visible:ring-offset-2"
          aria-label={t('ai.assistant.openAria')}
          title={t('ai.assistant.iconTooltip')}
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* Floating chat panel */}
      {isOpen &&
        (() => {
          const pos = getPanelPosition();
          return (
            <div
              dir={dir}
              data-floating-ai-chat="true"
              role="dialog"
              aria-label={t('ai.assistant.title')}
              style={{
                top: pos.top !== undefined ? `${pos.top}px` : undefined,
                bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
                insetInlineStart:
                  pos.insetInlineStart !== undefined ? `${pos.insetInlineStart}px` : undefined,
                insetInlineEnd:
                  pos.insetInlineEnd !== undefined ? `${pos.insetInlineEnd}px` : undefined,
                width: `${pos.maxWidth}px`,
                maxHeight: `${pos.maxHeight}px`,
                height: `${pos.maxHeight}px`,
              }}
              className={`fixed z-50 flex flex-col overflow-hidden
                         w-[380px] sm:w-[420px]
                         bg-white dark:bg-slate-900
                         shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl
                         ${isPanelDragging ? '' : 'transition-[width,height,box-shadow] duration-200'}
                         print:hidden
                         max-sm:!top-0 max-sm:!bottom-0 max-sm:!inset-x-0
                         max-sm:!w-full max-sm:!h-full
                         max-sm:!max-h-full max-sm:!rounded-none`}
            >
              {/* Header (Draggable) */}
              <div
                data-surface="dark"
                onMouseDown={handlePanelDragStart}
                style={{
                  cursor: isPanelDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                className="bg-[#2c5282] dark:bg-slate-950 text-white px-4 py-2.5 flex items-center
                           justify-between gap-2 flex-shrink-0 select-none border-b border-white/10 dark:border-slate-800"
                title={t('ai.assistant.dragTooltip')}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#ffcb56]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                      {t('ai.assistant.title')}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={messages.length === 0 || isLoading}
                    className="h-9 px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium
                               text-white/85 hover:text-white hover:bg-white/10
                               disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('ai.assistant.newChat')}
                    title={t('ai.assistant.newChat')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('ai.assistant.newChat')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg
                               text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={
                      isExpanded ? t('ai.assistant.collapse') : t('ai.assistant.expand')
                    }
                    title={isExpanded ? t('ai.assistant.collapse') : t('ai.assistant.expand')}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg
                               text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label={t('ai.assistant.close')}
                    title={t('ai.assistant.close')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Subtle Scope & Status Subtitle Pill Bar */}
              <div className="bg-slate-100/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-3.5 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 min-w-0 max-w-[70%]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400 flex-shrink-0" />
                  <span className="truncate">{scopeLabel}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLoading
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>
                    {isLoading
                      ? isFr
                        ? 'En cours'
                        : 'جاري البحث'
                      : t('ai.assistant.ready')}
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-slate-50 dark:bg-slate-950/60 flex flex-col"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-slate-500 dark:text-slate-400 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shadow-2xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {t('ai.assistant.empty')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {t('ai.assistant.subtitle')}
                      </p>
                    </div>

                    <div className="w-full pt-1 space-y-2">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-start">
                        {t('ai.assistant.contextualPrompts')}
                      </p>
                      <div className="flex flex-col gap-2">
                        {suggestedQueries.map((query) => (
                          <button
                            key={query}
                            type="button"
                            onClick={() => handleSendMessage(query)}
                            className="min-h-[44px] text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900
                                       border border-slate-200 dark:border-slate-800
                                       hover:border-[#2c5282] dark:hover:border-blue-500/70
                                       hover:text-[#2c5282] dark:hover:text-blue-300
                                       hover:bg-blue-50/50 dark:hover:bg-slate-800/80
                                       transition-colors text-slate-700 dark:text-slate-200
                                       shadow-2xs text-start flex items-center justify-between gap-2.5 group"
                          >
                            <span className="leading-snug">{query}</span>
                            <Sparkles className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div className="bg-[#2c5282] dark:bg-blue-800 text-white rounded-2xl rounded-se-xs px-3.5 py-2.5 text-sm max-w-[85%] leading-relaxed shadow-xs">
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      ) : (
                        <div
                          className={`border rounded-2xl rounded-ss-xs p-3.5 text-sm max-w-[94%] shadow-2xs space-y-3 leading-relaxed ${
                            msg.isError
                              ? 'border-red-200 bg-red-50/50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Clickable Document Source Cards */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
                                <span className="tabular-nums">
                                  {t('ai.assistant.sourcesCount')} ({msg.sources.length})
                                </span>
                              </div>

                              <div className="space-y-2">
                                {msg.sources.map((source) => {
                                  const scorePercent = Math.round((source.score || 0) * 100);
                                  const isIncoming = source.documentType === 'incoming';
                                  const formattedSourceDate = source.date
                                    ? formatShortDate(source.date, '')
                                    : '';

                                  return (
                                    <button
                                      key={source.documentId}
                                      type="button"
                                      onClick={() => handleNavigateToDocument(source)}
                                      className="w-full text-start p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/70
                                                 hover:bg-blue-50/50 dark:hover:bg-slate-800
                                                 border border-slate-200/90 dark:border-slate-700/80
                                                 hover:border-[#2c5282]/50 dark:hover:border-blue-500/60
                                                 transition-all flex flex-col gap-1.5 group shadow-2xs"
                                    >
                                      <div className="flex items-start justify-between gap-2 w-full">
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <FileText className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400 flex-shrink-0" />
                                          <span className="truncate font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-300">
                                            {source.subject || t('ai.assistant.untitled')}
                                          </span>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 flex-shrink-0 rtl-mirror" />
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                        {source.serialNumber && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold tabular-nums">
                                            <bdi dir="ltr">
                                              #{source.serialNumber}
                                              {source.year ? ` / ${source.year}` : ''}
                                            </bdi>
                                          </span>
                                        )}

                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold ${
                                            isIncoming
                                              ? 'bg-blue-50 text-[#1e3a5f] border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60'
                                              : 'bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'
                                          }`}
                                        >
                                          {isIncoming
                                            ? t('ai.assistant.incoming')
                                            : t('ai.assistant.outgoing')}
                                        </span>

                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60 font-semibold tabular-nums">
                                          {scorePercent}%
                                        </span>

                                        {source.source && (
                                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                            <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                                            <span className="truncate">{source.source}</span>
                                          </span>
                                        )}

                                        {formattedSourceDate && (
                                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums ms-auto">
                                            <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                            <bdi dir="ltr">{formattedSourceDate}</bdi>
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Reply footer: timestamp + Copy action */}
                          {!msg.isError && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                              <span className="tabular-nums">
                                <bdi dir="ltr">{formatTime(msg.timestamp, false, '')}</bdi>
                              </span>

                              <button
                                type="button"
                                onClick={() => handleCopyReply(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md
                                           text-slate-500 dark:text-slate-400
                                           hover:text-[#2c5282] dark:hover:text-blue-300
                                           hover:bg-slate-100 dark:hover:bg-slate-800
                                           transition-colors font-medium"
                                aria-label={t('ai.assistant.copyReply')}
                              >
                                {copiedMessageId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      {t('ai.assistant.copied')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>{t('ai.assistant.copyReply')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Animated thinking indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2.5 self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl rounded-ss-xs px-3.5 py-2.5 text-xs shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#2c5282] dark:text-blue-400 animate-pulse flex-shrink-0" />
                    <span className="font-medium">{t('ai.assistant.searching')}</span>
                    <span className="inline-flex items-center gap-1 ms-0.5" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282] dark:bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282] dark:bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282] dark:bg-blue-400 animate-bounce" />
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Composer */}
              <div className="border-t border-slate-200 dark:border-slate-800 px-3 pt-2.5 pb-2 bg-white dark:bg-slate-900 flex-shrink-0 space-y-1.5">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder={t('ai.assistant.placeholder')}
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-slate-50 dark:bg-slate-950
                               border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#2c5282] dark:focus:ring-blue-500
                               focus:bg-white dark:focus:bg-slate-900
                               text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                               disabled:opacity-50 overflow-y-auto leading-relaxed transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !input.trim()}
                    className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#2c5282] hover:bg-[#234269]
                               dark:bg-blue-700 dark:hover:bg-blue-600 text-white
                               disabled:opacity-40 disabled:cursor-not-allowed transition-all
                               flex items-center justify-center flex-shrink-0 shadow-xs"
                    aria-label={t('ai.assistant.send')}
                    title={t('ai.assistant.send')}
                  >
                    <Send className="w-4 h-4 rtl-mirror" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                  <span>{t('ai.assistant.composerHint')}</span>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default FloatingAIChat;

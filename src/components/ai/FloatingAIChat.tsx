import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/i18n/useDirection';
import {
  Sparkles,
  X,
  Trash2,
  Send,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { askAIAssistant, ChatSource } from '@/services/aiChatService';

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
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 600;
const MARGIN = 16;
const GAP = 8;

export const FloatingAIChat: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dir } = useDirection();

  const suggestedQueries = [
    t('ai.suggestedQuery1'),
    t('ai.suggestedQuery2'),
    t('ai.suggestedQuery3'),
  ];
  const [isOpen, setIsOpen] = useState(false);
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

  // Position et drag de l'icône
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
    } catch {}
    return { x: 24, y: 24 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Drag du panneau
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });
  const panelHasDraggedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sauvegarde de l'historique dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save AI chat history to localStorage:', e);
    }
  }, [messages]);

  // Sauvegarde de la position dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai_chat_position', JSON.stringify(position));
    } catch {}
  }, [position]);

  // Détection position intelligente du panneau selon la position de l'icône
  const getPanelPosition = () => {
    const iconTop = window.innerHeight - position.y - ICON_SIZE;
    const iconLeft = window.innerWidth - position.x - ICON_SIZE;

    // Vertical : icône dans la moitié HAUTE → panneau descend
    const openDownward = iconTop < window.innerHeight / 2;

    // Horizontal : icône dans la moitié DROITE → panneau aligné à droite
    const alignRight = position.x < window.innerWidth / 2;

    let top: number | undefined;
    let bottom: number | undefined;
    let left: number | undefined;
    let right: number | undefined;

    if (openDownward) {
      top = iconTop + ICON_SIZE + GAP;
      bottom = undefined;
    } else {
      bottom = position.y + ICON_SIZE + GAP;
      top = undefined;
    }

    if (alignRight) {
      right = Math.max(MARGIN, Math.min(position.x, window.innerWidth - PANEL_WIDTH - MARGIN));
      left = undefined;
    } else {
      left = Math.max(MARGIN, iconLeft);
      right = undefined;
    }

    // Hauteur adaptative
    let maxHeight: number;
    if (openDownward) {
      maxHeight = window.innerHeight - (top ?? 0) - MARGIN;
    } else {
      maxHeight = window.innerHeight - (bottom ?? 0) - MARGIN;
    }
    maxHeight = Math.max(300, Math.min(PANEL_HEIGHT, maxHeight));

    // Largeur adaptative
    const maxWidth = Math.min(PANEL_WIDTH, window.innerWidth - 2 * MARGIN);

    return { top, bottom, left, right, maxHeight, maxWidth };
  };

  // Drag de l'icône — contraindre dans le viewport
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

      setPosition((prev) => {
        const newX = prev.x - dx;
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
  }, [isDragging, dragOffset]);

  // Drag du panneau via son header
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

      setPosition((prev) => {
        const newX = prev.x - dx;
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
  }, [isPanelDragging, panelDragOffset]);

  // Resize — recadrer si la fenêtre rétrécit
  useEffect(() => {
    const onResize = () => {
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

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  // Fermeture avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus textarea à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

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
    } catch (err: any) {
      console.error('[AI Chat] Erreur:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        t('ai.errorMessage');

      const errorAssistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `❌ ${errorMessage}`,
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

  const handleNavigateToDocument = (source: ChatSource) => {
    const basePath =
      source.documentType === 'incoming'
        ? '/dashboard/incoming-documents'
        : '/dashboard/outgoing-documents';
    navigate(`${basePath}/${source.documentId}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* ─── Bouton Flottant (Fermé / Déplaçable librement) ─── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            if (!hasDraggedRef.current) setIsOpen(true);
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            setPosition({ x: 24, y: 24 });
            toast.success(t('ai.assistant.resetPosition'));
          }}
          style={{
            right: `${position.x}px`,
            bottom: `${position.y}px`,
            width: `${ICON_SIZE}px`,
            height: `${ICON_SIZE}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          className="fixed z-50 rounded-full bg-[#2c5282] hover:bg-[#234269] 
                     text-white shadow-lg flex items-center justify-center 
                     transition-all duration-150 select-none
                     focus:outline-none focus:ring-2 focus:ring-[#2c5282] focus:ring-offset-2"
          aria-label={t('ai.assistant.openAria')}
          title={t('ai.assistant.iconTooltip')}
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
      )}

      {/* ─── Panneau Flottant (Ouvert / Position intelligente + Header Draggable) ─── */}
      {isOpen &&
        (() => {
          const pos = getPanelPosition();
          return (
            <div
              dir={dir}
              role="dialog"
              aria-label={t('ai.assistant.title')}
              style={{
                top: pos.top !== undefined ? `${pos.top}px` : undefined,
                bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
                left: pos.left !== undefined ? `${pos.left}px` : undefined,
                right: pos.right !== undefined ? `${pos.right}px` : undefined,
                width: `${pos.maxWidth}px`,
                maxHeight: `${pos.maxHeight}px`,
                height: `${Math.min(PANEL_HEIGHT, pos.maxHeight)}px`,
              }}
              className="fixed z-50 flex flex-col overflow-hidden bg-white 
                         shadow-2xl border border-slate-200 rounded-2xl 
                         transition-all duration-150
                         max-sm:!top-0 max-sm:!bottom-0 max-sm:!left-0 
                         max-sm:!right-0 max-sm:!w-full max-sm:!h-full 
                         max-sm:!max-h-full max-sm:!rounded-none"
            >
              {/* Header — DRAGGABLE */}
              <div
                onMouseDown={handlePanelDragStart}
                style={{
                  cursor: isPanelDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                className="bg-[#2c5282] text-white px-4 py-3 flex items-center 
                           justify-between flex-shrink-0 select-none shadow-sm"
                title={t('ai.assistant.dragTooltip')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold flex items-center gap-1.5">
                    <span>🤖</span>
                    <span>{t('ai.assistant.title')}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white 
                                 hover:bg-white/10 transition-colors"
                      aria-label={t('ai.assistant.clearHistoryAria')}
                      title={t('ai.assistant.clearHistoryAria')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white 
                               hover:bg-white/10 transition-colors"
                    aria-label={t('ai.assistant.close')}
                    title={t('ai.assistant.close')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Zone Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 flex flex-col"
                aria-live="polite"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2c5282] flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        {t('ai.assistant.empty')}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t('ai.assistant.subtitle')}
                      </p>
                    </div>

                    <div className="w-full pt-2 space-y-2">
                      <p className="text-[11px] font-medium text-slate-400">
                        {t('ai.assistant.searchExamples')}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {suggestedQueries.map((query) => (
                          <button
                            key={query}
                            type="button"
                            onClick={() => handleSendMessage(query)}
                            className="text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#2c5282] hover:text-[#2c5282] hover:bg-blue-50/50 transition-colors text-slate-700 shadow-2xs text-right flex items-center justify-between"
                          >
                            <span>{query}</span>
                            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
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
                        <div className="bg-[#2c5282] text-white rounded-2xl rounded-tr-xs p-3 text-sm max-w-[85%] leading-relaxed shadow-xs">
                          {msg.content}
                        </div>
                      ) : (
                        <div
                          className={`bg-white text-slate-800 border ${
                            msg.isError
                              ? 'border-red-200 bg-red-50/30'
                              : 'border-slate-200'
                          } rounded-2xl rounded-tl-xs p-3.5 text-sm max-w-[92%] shadow-2xs space-y-3 leading-relaxed`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Sources cliquables */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                <span>📄 {t('ai.assistant.sourcesCount')} ({msg.sources.length}):</span>
                              </div>

                              <div className="space-y-1.5">
                                {msg.sources.map((source) => {
                                  const scorePercent = Math.round(
                                    (source.score || 0) * 100
                                  );
                                  return (
                                    <button
                                      key={source.documentId}
                                      type="button"
                                      onClick={() =>
                                        handleNavigateToDocument(source)
                                      }
                                      className="w-full text-right p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors flex items-center justify-between gap-2 group text-xs text-slate-700"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <FileText className="w-3.5 h-3.5 text-[#2c5282] flex-shrink-0" />
                                        <span className="truncate font-medium text-slate-800 group-hover:text-[#2c5282]">
                                          {source.subject || t('ai.assistant.untitled')}
                                          {source.serialNumber &&
                                            ` — ${source.serialNumber}/${source.year || ''}`}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                                          {scorePercent}%
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Indicateur de chargement */}
                {isLoading && (
                  <div className="flex items-center gap-2 self-start bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs shadow-2xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2c5282]" />
                    <span>{t('ai.assistant.loading')}</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input zone */}
              <div className="border-t border-slate-200 p-3 bg-white flex-shrink-0 flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={t('ai.assistant.placeholder')}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c5282] focus:bg-white text-slate-800 disabled:opacity-50 max-h-24 overflow-y-auto leading-relaxed"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 rounded-xl bg-[#2c5282] hover:bg-[#234269] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0 shadow-xs"
                  aria-label={t('ai.assistant.send')}
                  title={t('ai.assistant.send')}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default FloatingAIChat;

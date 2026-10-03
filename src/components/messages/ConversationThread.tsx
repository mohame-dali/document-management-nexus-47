import React, { useRef, useEffect } from 'react';
import { ArrowRight, MessageSquare, MoreVertical } from 'lucide-react';
import MessageBubble from '@/components/messages/MessageBubble';
import MessageInput from '@/components/messages/MessageInput';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getDateGroup } from '@/utils/relativeTime';
import { OnlineIndicator } from '@/components/common/OnlineIndicator';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';

export interface ConversationData {
  interlocutorId: string;
  interlocutorName: string;
  interlocutorRole?: string;
  interlocutorPhoto?: string | null;
  interlocutorDepartment?: string;
  interlocutorUsername?: string;
  lastMessage?: string;
  lastMessageTime?: Date | string;
  unreadCount?: number;
  messages: any[];
}

export interface ConversationThreadProps {
  conversation: ConversationData | null;
  currentUserId: string;
  onSendMessage: (content: string, attachments: File[]) => void;
  onBack?: () => void;
  isSending?: boolean;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  conversation,
  currentUserId,
  onSendMessage,
  onBack,
  isSending = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isUserOnline } = useOnlineUsers();

  // Auto-scroll to bottom on conversation load or new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.interlocutorId, conversation?.messages?.length]);

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#f7fafc]">
        <div className="p-4 bg-white border border-[#e2e8f0] rounded-full text-slate-400 shadow-xs mb-3">
          <MessageSquare className="h-8 w-8 text-[#2c5282]" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          اختر محادثة لعرض الرسائل
        </h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          اختر زميلاً أو مسؤولاً من القائمة الجانبية لبدء المحادثة الفورية وعرض سجل المراسلات المتبادلة
        </p>
      </div>
    );
  }

  // Sort messages chronologically (oldest to newest)
  const sortedMessages = [...(conversation.messages || [])].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const checkIsOwn = (msg: any): boolean => {
    if (msg.isSender !== undefined) return Boolean(msg.isSender);
    const senderId = typeof msg.sender === 'object' ? msg.sender?._id : msg.sender;
    return String(senderId) === String(currentUserId);
  };

  const interlocutorInitial = (conversation.interlocutorName?.[0] || '؟').toUpperCase();

  return (
    <div className="h-full flex flex-col bg-[#f7fafc] overflow-hidden" dir="rtl">
      {/* Header Messenger */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="العودة للقائمة"
              className="md:hidden h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full p-0"
              title="العودة للقائمة"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}

          {/* Interlocutor Avatar */}
          <div className="relative">
            <Avatar className="w-10 h-10 ring-1 ring-slate-200">
              <AvatarImage src={conversation.interlocutorPhoto || undefined} alt={conversation.interlocutorName} />
              <AvatarFallback className="bg-[#2c5282]/10 text-[#2c5282] text-sm font-bold">
                {interlocutorInitial}
              </AvatarFallback>
            </Avatar>
            {isUserOnline(conversation.interlocutorId) && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>

          {/* Interlocutor Info */}
          <div>
            <h3 className="text-sm font-bold text-[#1a202c] leading-tight">
              {conversation.interlocutorName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <OnlineIndicator 
                isOnline={isUserOnline(conversation.interlocutorId)} 
                size="sm"
                showLabel={true}
              />
              {conversation.interlocutorDepartment && (
                <span className="text-[11px] text-slate-400 font-normal mr-1">
                  • {conversation.interlocutorDepartment}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="خيارات المحادثة"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread Scroll Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-[#f7fafc] space-y-2 scroll-smooth"
      >
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا توجد رسائل سابقة في هذه المحادثة. أرسل الرسالة الأولى أدناه.
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const isOwn = checkIsOwn(msg);
            
            // Calculer si on doit insérer un séparateur temporel
            const currentDateStr = new Date(msg.createdAt).toDateString();
            const prevDateStr = idx > 0 ? new Date(sortedMessages[idx - 1].createdAt).toDateString() : null;
            const showTimeSeparator = idx === 0 || currentDateStr !== prevDateStr;

            const timeGroup = getDateGroup(msg.createdAt);
            const timeLabel = timeGroup === 'today'
              ? 'اليوم'
              : timeGroup === 'yesterday'
              ? 'أمس'
              : new Date(msg.createdAt).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' });

            return (
              <React.Fragment key={msg._id || msg.id || idx}>
                {showTimeSeparator && (
                  <div className="flex items-center justify-center my-4 select-none">
                    <div className="bg-slate-200/70 text-slate-600 text-[11px] px-3 py-1 rounded-full font-medium shadow-2xs">
                      {timeLabel}
                    </div>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (style Messenger) */}
      <MessageInput
        onSend={onSendMessage}
        disabled={isSending}
        placeholder="Aa"
      />
    </div>
  );
};

export default ConversationThread;

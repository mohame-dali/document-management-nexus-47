import React, { useRef, useEffect } from 'react';
import { ArrowRight, MessageSquare, Shield, Building2 } from 'lucide-react';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import MessageBubble from '@/components/messages/MessageBubble';
import MessageInput from '@/components/messages/MessageInput';
import { Button } from '@/components/ui/button';

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

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages?.length]);

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

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] bg-white shadow-2xs z-10">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="العودة للقائمة"
              className="md:hidden h-11 w-11 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-0"
              title="العودة للقائمة"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}

          {/* Interlocutor Avatar */}
          <PersonnelAvatar
            photo={conversation.interlocutorPhoto}
            username={conversation.interlocutorUsername || conversation.interlocutorName}
            size="md"
            className="w-10 h-10 ring-1 ring-slate-200"
          />

          {/* Interlocutor Info */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              {conversation.interlocutorName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              {conversation.interlocutorRole && (
                <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                  <Shield className="h-3 w-3 text-slate-400" />
                  {conversation.interlocutorRole}
                </span>
              )}
              {conversation.interlocutorDepartment && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Building2 className="h-3 w-3" />
                  {conversation.interlocutorDepartment}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Message count badge */}
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          {sortedMessages.length} رسالة في المحادثة
        </div>
      </div>

      {/* Messages Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#f7fafc] space-y-2">
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا توجد رسائل سابقة في هذه المحادثة. أرسل الرسالة الأولى أدناه.
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <MessageBubble
              key={msg._id || msg.id}
              message={msg}
              isOwn={checkIsOwn(msg)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput
        onSend={onSendMessage}
        disabled={isSending}
        placeholder={`اكتب رسالة إلى ${conversation.interlocutorName}...`}
      />
    </div>
  );
};

export default ConversationThread;

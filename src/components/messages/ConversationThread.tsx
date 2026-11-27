import React, { useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, MessageSquare, MoreVertical, Plus, Users } from 'lucide-react';
import MessageBubble from '@/components/messages/MessageBubble';
import MessageInput from '@/components/messages/MessageInput';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { Button } from '@/components/ui/button';
import { getDateGroup } from '@/utils/relativeTime';
import { formatDayMonthLabel } from '@/utils/formatDate';
import { OnlineIndicator } from '@/components/common/OnlineIndicator';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { Message } from '@/types';

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
  messages: Message[];
}

export interface ConversationThreadProps {
  conversation: ConversationData | null;
  currentUserId: string;
  onSendMessage: (content: string, attachments: File[]) => void;
  onBack?: () => void;
  onNewMessage?: () => void;
  onOpenContacts?: () => void;
  isSending?: boolean;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  conversation,
  currentUserId,
  onSendMessage,
  onBack,
  onNewMessage,
  onOpenContacts,
  isSending = false,
}) => {
  const { t, language } = useLanguage();
  const { isRTL } = useDirection();
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
      <div className="h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-slate-50/70 dark:bg-slate-950/60">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col items-center">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 mb-4">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
            {t('messages.selectMessage')}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed mb-5">
            {t('messages.selectInterlocutorDesc')}
          </p>

          {(onNewMessage || onOpenContacts) && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
              {onNewMessage && (
                <Button
                  type="button"
                  onClick={onNewMessage}
                  className="h-10 px-4 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('messages.newMessage')}</span>
                </Button>
              )}
              {onOpenContacts && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenContacts}
                  className="h-10 px-4 text-xs font-medium rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{t('messages.contactsDirectory')}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sort messages chronologically (oldest to newest)
  const sortedMessages = [...(conversation.messages || [])].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const checkIsOwn = (msg: Message): boolean => {
    if ((msg as Message & { isSender?: boolean }).isSender !== undefined) {
      return Boolean((msg as Message & { isSender?: boolean }).isSender);
    }
    const senderId =
      typeof msg.sender === 'object' && msg.sender !== null
        ? (msg.sender as { _id?: string })._id
        : msg.sender;
    return String(senderId) === String(currentUserId);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/70 dark:bg-slate-950/60 overflow-hidden">
      {/* Header Messenger */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={t('messages.backToList')}
              className="md:hidden h-10 w-10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-0 shrink-0"
              title={t('messages.backToList')}
            >
              {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
          )}

          {/* Interlocutor Avatar */}
          <div className="relative shrink-0">
            <PersonnelAvatar
              photo={conversation.interlocutorPhoto}
              username={conversation.interlocutorUsername || conversation.interlocutorName}
              size="md"
              className="w-10 h-10 ring-1 ring-slate-200 dark:ring-slate-700"
            />
            {isUserOnline(conversation.interlocutorId) && (
              <span className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>

          {/* Interlocutor Info */}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {conversation.interlocutorName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <OnlineIndicator
                isOnline={isUserOnline(conversation.interlocutorId)}
                size="sm"
                showLabel={true}
              />
              {conversation.interlocutorDepartment && (
                <span className="text-[13px] text-slate-700 dark:text-slate-300 font-normal truncate">
                  • {conversation.interlocutorDepartment}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button */}
        <button
          type="button"
          aria-label={t('messages.conversationOptions')}
          className="h-9 w-9 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
          title={t('messages.conversationOptions')}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Thread Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-slate-50/70 dark:bg-slate-950/60 space-y-2 scroll-smooth"
      >
        {sortedMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-700 dark:text-slate-300 text-xs">
            {t('messages.noPreviousMessages')}
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const isOwn = checkIsOwn(msg);

            // Insert temporal separator when day changes
            const currentDateStr = new Date(msg.createdAt).toDateString();
            const prevDateStr = idx > 0 ? new Date(sortedMessages[idx - 1].createdAt).toDateString() : null;
            const showTimeSeparator = idx === 0 || currentDateStr !== prevDateStr;

            const timeGroup = getDateGroup(msg.createdAt);
            const timeLabel = timeGroup === 'today'
              ? t('common.today')
              : timeGroup === 'yesterday'
              ? t('common.yesterday')
              : formatDayMonthLabel(msg.createdAt, language);
            const labelDir =
              timeGroup === 'today' || timeGroup === 'yesterday'
                ? undefined
                : language === 'fr'
                  ? 'ltr'
                  : 'rtl';

            return (
              <React.Fragment key={msg._id || msg.id || idx}>
                {showTimeSeparator && (
                  <div className="flex items-center justify-center my-4 select-none">
                    <div className="bg-slate-200/80 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/60 text-[13px] px-3 py-1 rounded-full font-medium shadow-2xs tabular-nums">
                      <bdi dir={labelDir}>{timeLabel}</bdi>
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

      {/* Input Area */}
      <MessageInput
        onSend={onSendMessage}
        disabled={isSending}
        placeholder="Aa"
      />
    </div>
  );
};

export default ConversationThread;

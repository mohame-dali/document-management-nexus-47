import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { formatDistanceToNow } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { MessageSquare, Clock, Paperclip, AlertCircle, CheckCheck } from 'lucide-react';
import { getMessages } from '@/services/messageService';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface MessagesListProps {
  onSelectMessage: (messageId: string) => void;
  selectedMessageId?: string | null;
  searchTerm?: string;
  activeTab?: 'inbox' | 'sent';
}

const MessagesList: React.FC<MessagesListProps> = ({
  onSelectMessage,
  selectedMessageId,
  searchTerm = '',
  activeTab = 'inbox'
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  const { data: messagesResponse, isLoading, error } = useQuery({
    queryKey: ['messages', activeTab],
    queryFn: () => getMessages(activeTab)
  });

  const messages = messagesResponse?.data || [];

  const filteredMessages = messages.filter((message: Message) => {
    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase().trim();
    const subjectMatch = message.subject?.toLowerCase().includes(term);
    const contentMatch = message.content?.toLowerCase().includes(term);

    let senderMatch = false;
    if (typeof message.sender === 'object' && message.sender?.username) {
      senderMatch = message.sender.username.toLowerCase().includes(term);
    }

    let recipientMatch = false;
    if (Array.isArray(message.recipients)) {
      recipientMatch = message.recipients.some(r => {
        if (typeof r.user === 'object' && r.user?.username) {
          return r.user.username.toLowerCase().includes(term);
        }
        return false;
      });
    }

    return subjectMatch || contentMatch || senderMatch || recipientMatch;
  });

  const isMessageRead = (message: Message): boolean => {
    if (!currentUser?._id) return true;
    if (activeTab === 'sent') return true;
    if ('isRead' in message && typeof message.isRead === 'boolean') {
      return message.isRead;
    }

    if (Array.isArray(message.recipients)) {
      const recipient = message.recipients.find((r: { user?: string | { _id?: string }; read?: boolean }) => {
        if (typeof r === 'object' && r !== null && r.user) {
          const uId = typeof r.user === 'object' ? (r.user as { _id?: string })._id : r.user;
          return uId?.toString() === currentUser._id?.toString();
        }
        return false;
      });
      return recipient ? !!recipient.read : true;
    }

    return true;
  };

  const getDisplayName = (message: Message): string => {
    const prefix = isRTL ? 'إلى:' : 'À :';
    if (activeTab === 'sent') {
      if (Array.isArray(message.recipients) && message.recipients.length > 0) {
        const names = message.recipients.map(r => {
          if (typeof r.user === 'object' && r.user?.username) {
            return r.user.username;
          }
          return t('messages.unknownUser');
        });
        if (names.length === 1) return `${prefix} ${names[0]}`;
        return `${prefix} ${names[0]} (+${names.length - 1})`;
      }
      return `${prefix} ${t('messages.unknownUser')}`;
    }

    if (typeof message.sender === 'object' && message.sender?.username) {
      return message.sender.username;
    }
    return t('messages.unknownUser');
  };

  const getDisplayPhoto = (message: Message): string | undefined => {
    const target = activeTab === 'sent' && Array.isArray(message.recipients) && message.recipients[0]?.user
      ? message.recipients[0].user
      : message.sender;

    if (typeof target === 'object' && target?.photo) {
      return target.photo;
    }
    return undefined;
  };

  const getDisplayRole = (message: Message): string => {
    const target = activeTab === 'sent' && Array.isArray(message.recipients) && message.recipients[0]?.user
      ? message.recipients[0].user
      : message.sender;

    if (typeof target === 'object' && target?.role) {
      return target.role;
    }
    return 'User';
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60';
      case 'AdminDepartment':
        return 'bg-blue-50 dark:bg-sky-950/40 text-[#2c5282] dark:text-sky-300 border-blue-200 dark:border-sky-800/60';
      case 'AdminTuningDesk':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (priority === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
          <AlertCircle className="h-3 w-3" />
          {isRTL ? 'عاجل' : 'Urgent'}
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#FFD758]/25 dark:bg-amber-500/20 text-[#92400e] dark:text-amber-300 border border-[#FFCB56]/50 dark:border-amber-500/40">
          {isRTL ? 'مرتفع' : 'Haute'}
        </span>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-white dark:bg-slate-900 animate-pulse flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-28" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
              </div>
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-44" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900">
        <div className="inline-flex p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{t('messages.error')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('messages.tryAgain')}</p>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
        <div className="inline-flex p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          {searchTerm
            ? t('messages.noMatchingResults')
            : (activeTab === 'sent'
                ? (isRTL ? 'لا توجد رسائل مرسلة' : 'Aucun message envoyé')
                : (isRTL ? 'صندوق الوارد فارغ' : 'Boîte de réception vide'))}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
          {searchTerm ? t('messages.tryOtherSearch') : t('messages.clickNewMessageToStart')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1 bg-white dark:bg-slate-900" dir={dir}>
      {filteredMessages.map((message: Message) => {
        const isRead = isMessageRead(message);
        const isSelected = selectedMessageId === message._id;
        const displayName = getDisplayName(message);
        const displayPhoto = getDisplayPhoto(message);
        const displayRole = getDisplayRole(message);
        const hasAttachments = Boolean(message.attachments && message.attachments.length > 0);

        return (
          <div
            key={message._id}
            onClick={() => onSelectMessage(message._id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectMessage(message._id);
              }
            }}
            className={`p-3 cursor-pointer text-start rounded-lg border transition-colors duration-150 ${
              isSelected
                ? 'bg-[#ebf4ff]/90 dark:bg-sky-950/45 border-sky-200 dark:border-sky-800/70 shadow-2xs'
                : !isRead
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70 dark:hover:bg-amber-950/30 border-amber-200/70 dark:border-amber-500/30'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 border-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative shrink-0 mt-0.5">
                <PersonnelAvatar
                  photo={displayPhoto}
                  username={displayName}
                  size="md"
                  className="h-9 w-9 ring-1 ring-slate-200 dark:ring-slate-700"
                />
                {!isRead && (
                  <span
                    className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-[#FFCB56] ring-2 ring-white dark:ring-slate-900"
                    title={t('messages.unread')}
                  />
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-xs truncate ${!isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                      {displayName}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-md ${getRoleBadgeClasses(displayRole)}`}>
                      {getRoleDisplayName(displayRole)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {activeTab === 'sent' && (
                      <span title={t('messages.sentStatus')}>
                        <CheckCheck className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                      {message.createdAt ? (
                        <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: isRTL ? ar : fr })}
                        </bdi>
                      ) : ''}
                    </span>
                  </div>
                </div>

                {/* Subject & Priority */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-xs truncate ${!isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                    {message.subject || t('messages.noSubject')}
                  </h4>
                  {getPriorityBadge(message.priority)}
                </div>

                {/* Content snippet */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                  {message.content || t('messages.noContent')}
                </p>

                {/* Footer indicators */}
                <div className="flex items-center justify-between mt-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    {hasAttachments && (
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                        <Paperclip className="h-3 w-3" />
                        {message.attachments?.length}
                      </span>
                    )}
                    {message.crossDepartment && (
                      <span className="text-[10px] text-[#2c5282] dark:text-sky-300 bg-blue-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded border border-blue-100 dark:border-sky-800/60">
                        {isRTL ? 'عبر الأقسام' : 'Interservices'}
                      </span>
                    )}
                  </div>

                  {!isRead && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56]/20 text-[#78350f] dark:text-amber-300 border border-[#FFD758]/70 dark:border-amber-500/40">
                      {isRTL ? 'جديدة' : 'Nouveau'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessagesList;

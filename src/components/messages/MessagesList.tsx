import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MessageSquare, Clock, Paperclip, AlertCircle, Check, CheckCheck } from 'lucide-react';
import { getMessages } from '@/services/messageService';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';

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
    
    // If active tab is sent, sender has already seen it
    if (activeTab === 'sent') return true;
    
    // Check explicit boolean
    if ('isRead' in message && typeof message.isRead === 'boolean') {
      return message.isRead;
    }
    
    if (Array.isArray(message.recipients)) {
      const recipient = message.recipients.find((r: any) => {
        if (typeof r === 'object' && r.user) {
          const uId = typeof r.user === 'object' ? r.user._id : r.user;
          return uId?.toString() === currentUser._id?.toString();
        }
        return false;
      });
      return recipient ? !!recipient.read : true;
    }
    
    return true;
  };

  const getDisplayName = (message: Message): string => {
    if (activeTab === 'sent') {
      if (Array.isArray(message.recipients) && message.recipients.length > 0) {
        const names = message.recipients.map(r => {
          if (typeof r.user === 'object' && r.user?.username) {
            return r.user.username;
          }
          return t('messages.unknownUser');
        });
        if (names.length === 1) return `إلى: ${names[0]}`;
        return `إلى: ${names[0]} (+${names.length - 1})`;
      }
      return 'إلى: مستلم غير معروف';
    }

    if (typeof message.sender === 'object' && message.sender?.username) {
      return message.sender.username;
    }
    return t('messages.unknownUser');
  };

  const getDisplayPhoto = (message: Message): string => {
    const target = activeTab === 'sent' && Array.isArray(message.recipients) && message.recipients[0]?.user
      ? message.recipients[0].user
      : message.sender;

    if (typeof target === 'object' && target?.photo) {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${API_URL}${target.photo}`;
    }
    return '';
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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'AdminDepartment':
        return 'bg-blue-50 text-[#2c5282] border-blue-200';
      case 'AdminTuningDesk':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (priority === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
          <AlertCircle className="h-3 w-3" />
          عاجل
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[#FFD758]/25 text-[#92400e] border border-[#FFCB56]/50">
          مرتفع
        </span>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="divide-y divide-[#e2e8f0]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 bg-white animate-pulse flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3.5 bg-slate-200 rounded w-28" />
                <div className="h-3 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-3.5 bg-slate-200 rounded w-44" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-slate-600 bg-white">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-800 mb-1">{t('messages.error')}</p>
        <p className="text-xs text-slate-500">{t('messages.tryAgain')}</p>
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white">
        <div className="inline-flex p-3 bg-slate-100 text-slate-400 rounded mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 mb-1">
          {searchTerm ? 'لم يتم العثور على أي رسائل مطابقة' : (activeTab === 'sent' ? 'لا توجد رسائل مرسلة' : 'صندوق الوارد فارغ')}
        </p>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          {searchTerm ? 'جرّب تعديل كلمات البحث' : 'ابدأ بكتابة رسالة جديدة للتواصل مع زملائك'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#edf2f7] bg-white" dir="rtl">
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
            className={`p-3.5 cursor-pointer text-right transition-colors duration-200 border-r-4 ${
              isSelected 
                ? 'bg-[#ebf4ff] border-r-[#2c5282]' 
                : !isRead 
                  ? 'bg-amber-50/40 hover:bg-amber-50/70 border-r-[#FFCB56]' 
                  : 'bg-white hover:bg-slate-50 border-r-transparent'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0 mt-0.5">
                <Avatar className="h-9 w-9 rounded border border-[#e2e8f0]">
                  {displayPhoto ? (
                    <AvatarImage src={displayPhoto} alt={displayName} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded bg-slate-100 text-[#2c5282] font-semibold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isRead && (
                  <span 
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FFCB56] ring-2 ring-white" 
                    title="غير مقروءة"
                  />
                )}
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                {/* Header row: Sender + Badges + Date */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-xs truncate ${!isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                      {displayName}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded ${getRoleBadgeClasses(displayRole)}`}>
                      {getRoleDisplayName(displayRole)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] text-slate-500">
                    {activeTab === 'sent' && (
                      <span title="مرسلة">
                        <CheckCheck className="h-3.5 w-3.5 text-[#2c5282]" />
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {message.createdAt
                        ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ar })
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Subject & Priority */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-xs truncate ${!isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {message.subject || t('messages.noSubject')}
                  </h4>
                  {getPriorityBadge(message.priority)}
                </div>

                {/* Content snippet */}
                <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug">
                  {message.content || t('messages.noContent')}
                </p>

                {/* Footer indicators */}
                <div className="flex items-center justify-between mt-1.5 pt-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    {hasAttachments && (
                      <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                        <Paperclip className="h-3 w-3" />
                        {message.attachments?.length}
                      </span>
                    )}
                    {message.crossDepartment && (
                      <span className="text-[10px] text-[#2c5282] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        عبر الأقسام
                      </span>
                    )}
                  </div>

                  {!isRead && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56]/20 text-[#78350f] border border-[#FFD758]">
                      جديدة
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

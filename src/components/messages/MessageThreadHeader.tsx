import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Reply,
  Trash2,
  Clock,
  Shield,
  Building2,
  Settings,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { formatDateTime } from '@/utils/formatDate';

interface MessageThreadHeaderProps {
  onBack: () => void;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  message: Message;
}

const MessageThreadHeader: React.FC<MessageThreadHeaderProps> = ({
  onBack,
  onReply,
  onDelete,
  message
}) => {
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield className="h-3 w-3" />;
      case 'AdminDepartment': return <Building2 className="h-3 w-3" />;
      case 'AdminTuningDesk': return <Settings className="h-3 w-3" />;
      default: return <UserIcon className="h-3 w-3" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60';
      case 'AdminDepartment': return 'bg-blue-50 dark:bg-sky-950/40 text-[#2c5282] dark:text-sky-300 border-blue-200 dark:border-sky-800/60';
      case 'AdminTuningDesk': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const senderInfo = message.sender && typeof message.sender === 'object' ? message.sender : null;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pb-4 mb-5" dir={dir}>
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 text-xs font-medium"
        >
          {isRTL ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{t('messages.backToMessages')}</span>
        </Button>

        <div className="flex items-center gap-2">
          {onReply && (
            <Button
              size="sm"
              onClick={() => onReply(message)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#2c5282] hover:bg-[#234269] dark:bg-sky-700 dark:hover:bg-sky-600 text-white transition-colors duration-200 text-xs font-medium"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>{t('messages.reply')}</span>
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(message._id)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-800 transition-colors duration-200 text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t('messages.delete')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Subject & Meta */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {message.subject}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {message.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                <AlertCircle className="h-3 w-3" />
                {isRTL ? 'عاجل جداً' : 'Très urgent'}
              </span>
            )}
            {message.priority === 'high' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#FFD758]/25 dark:bg-amber-500/20 text-[#92400e] dark:text-amber-300 border border-[#FFCB56]">
                {isRTL ? 'أولوية مرتفعة' : 'Priorité haute'}
              </span>
            )}

            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs rounded-md border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal"
            >
              {message.messageType === 'one-to-many'
                ? (isRTL ? 'رسالة جماعية' : 'Message groupé')
                : (isRTL ? 'رسالة فردية' : 'Message individuel')}
            </Badge>

            {message.crossDepartment && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-sky-950/40 text-[#2c5282] dark:text-sky-300 border-blue-200 dark:border-sky-800/60 px-2 py-0.5 text-xs rounded-md font-normal">
                {isRTL ? 'عبر الأقسام' : 'Interservices'}
              </Badge>
            )}
          </div>
        </div>

        {/* Sender and Recipients Box */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 text-xs space-y-2">
          {/* Sender */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {isRTL ? 'المرسل:' : 'Expéditeur :'}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {senderInfo ? senderInfo.username : t('messages.unknownUser')}
              </span>
              {senderInfo && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded-md ${getRoleColor(senderInfo.role)}`}>
                  {getRoleIcon(senderInfo.role)}
                  <span className="ms-1">{getRoleDisplayName(senderInfo.role)}</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 tabular-nums">
              <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <bdi dir={isRTL ? 'rtl' : 'ltr'}>{formatDateTime(message.createdAt, language)}</bdi>
            </div>
          </div>

          {/* Recipients */}
          <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap mt-0.5">
              {isRTL ? 'المستلمون:' : 'Destinataires :'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {message.recipients?.map((recipient, index) => {
                const recipientUser = recipient.user && typeof recipient.user === 'object' ? recipient.user : null;
                const recipientName = recipientUser ? recipientUser.username : t('messages.unknownUser');
                const isRead = recipient.read;

                return (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-[11px] text-slate-700 dark:text-slate-200"
                  >
                    <span>{recipientName}</span>
                    {isRead ? (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-800/60">
                        {isRTL ? 'مقروءة' : 'Lu'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#854d0e] dark:text-amber-300 bg-[#FFD758]/20 dark:bg-amber-500/20 px-1 rounded border border-[#FFCB56]/80 dark:border-amber-500/40">
                        {isRTL ? 'غير مقروءة' : 'Non lu'}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageThreadHeader;

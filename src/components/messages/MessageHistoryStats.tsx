import React from 'react';
import { MessageSquare, Users, User, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface MessageHistoryStatsProps {
  totalMessages: number;
  unreadCount: number;
  inboxCount?: number;
  sentCount?: number;
  oneToOneCount?: number;
  groupCount?: number;
}

const MessageHistoryStats: React.FC<MessageHistoryStatsProps> = ({
  totalMessages,
  unreadCount,
  oneToOneCount = 0,
  groupCount = 0
}) => {
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3" dir={dir}>
      {/* Total Messages Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2 shadow-xs flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[13px] text-slate-700 dark:text-slate-300 font-medium truncate">
            {t('messages.total')}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
            {totalMessages}
          </span>
        </div>
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-[#2c5282] dark:text-sky-400 shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
      </div>

      {/* Unread Card */}
      <div
        className={`rounded-lg px-3 py-2 shadow-xs flex items-center justify-between gap-2 border transition-colors ${
          unreadCount > 0
            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-500/40'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}
      >
        <div className="min-w-0">
          <span className="block text-[13px] text-slate-700 dark:text-slate-300 font-medium truncate">
            {t('messages.unread')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
              {unreadCount}
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[13px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                {isRTL ? 'جديد' : 'Nouveau'}
              </span>
            )}
          </div>
        </div>
        <div className="p-2 bg-[#FFD758]/20 dark:bg-amber-500/15 rounded-md text-[#854d0e] dark:text-amber-300 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </div>
      </div>

      {/* Direct / One-to-One */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2 shadow-xs flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[13px] text-slate-700 dark:text-slate-300 font-medium truncate">
            {t('messages.oneToOne')}
          </span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-tight">
            {oneToOneCount}
          </span>
        </div>
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 shrink-0">
          <User className="h-4 w-4" />
        </div>
      </div>

      {/* Group Messages */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-3 py-2 shadow-xs flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[13px] text-slate-700 dark:text-slate-300 font-medium truncate">
            {t('messages.group')}
          </span>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100 tabular-nums leading-tight">
            {groupCount}
          </span>
        </div>
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 shrink-0">
          <Users className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default MessageHistoryStats;

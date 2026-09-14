import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Users, User, Mail, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';

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
  inboxCount,
  sentCount,
  oneToOneCount = 0,
  groupCount = 0
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" dir="rtl">
      {/* Total Messages Card */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{t('messages.total')}</span>
          <div className="p-1.5 bg-slate-100 rounded text-[#2c5282]">
            <MessageSquare className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-xl font-bold text-slate-900">{totalMessages}</span>
        </div>
      </div>

      {/* Unread Card - subtly accented with Amber/Gold */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 shadow-xs border-r-4 border-r-[#FFCB56]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">{t('messages.unread')}</span>
          <div className="p-1.5 bg-[#FFD758]/20 rounded text-[#854d0e]">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xl font-bold text-slate-900">{unreadCount}</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              جديد
            </span>
          )}
        </div>
      </div>

      {/* Direct / One-to-One */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{t('messages.oneToOne')}</span>
          <div className="p-1.5 bg-slate-100 rounded text-slate-600">
            <User className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-xl font-bold text-slate-800">{oneToOneCount}</span>
        </div>
      </div>

      {/* Group Messages */}
      <div className="bg-white border border-[#e2e8f0] rounded p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{t('messages.group')}</span>
          <div className="p-1.5 bg-slate-100 rounded text-slate-600">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-xl font-bold text-slate-800">{groupCount}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageHistoryStats;

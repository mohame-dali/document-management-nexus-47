import React, { useState } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { ConversationData } from '@/components/messages/ConversationThread';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatShortDayMonth, formatTime } from '@/utils/formatDate';

export interface ConversationListProps {
  conversations: ConversationData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  hasAnyConversations?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  loading = false,
  hasAnyConversations = true,
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const formatConversationTime = (dateStr?: Date | string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday ? formatTime(d, false, '') : formatShortDayMonth(d, '');
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      conv.interlocutorName.toLowerCase().includes(term) ||
      conv.interlocutorRole?.toLowerCase().includes(term) ||
      conv.lastMessage?.toLowerCase().includes(term) ||
      conv.interlocutorDepartment?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute start-3.5 top-2.5 h-4 w-4 text-slate-700 dark:text-slate-300 pointer-events-none" />
          <Input
            placeholder={t('messages.searchConversationsOrNames')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs text-start ps-10 pe-3 border-slate-200 dark:border-slate-800 focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 rounded-lg bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="p-1.5 space-y-3" aria-busy="true" aria-label={t('messages.loadingConversations')}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-2/5" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          hasAnyConversations || searchTerm.trim() ? (
            <EmptyState
              icon={<MessageSquare className="h-5 w-5 text-slate-500 dark:text-slate-400" />}
              title={t('messages.noMatchingResults')}
              description={t('messages.tryOtherSearch')}
              className="border-0 bg-transparent py-10 px-4"
            />
          ) : (
            <div className="h-full" aria-hidden="true" />
          )
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedId === conv.interlocutorId;
            const hasUnread = (conv.unreadCount || 0) > 0;

            return (
              <div
                key={conv.interlocutorId}
                onClick={() => onSelect(conv.interlocutorId)}
                className={`min-h-[68px] p-2.5 flex items-start gap-3 cursor-pointer rounded-lg border transition-colors duration-150 ${
                  isSelected
                    ? 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700 shadow-2xs'
                    : hasUnread
                      ? 'bg-amber-50/35 dark:bg-amber-950/15 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 pt-0.5">
                  <PersonnelAvatar
                    photo={conv.interlocutorPhoto}
                    username={conv.interlocutorUsername || conv.interlocutorName}
                    size="md"
                    className="w-10 h-10 ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 bg-[#FFCB56] border-2 border-white dark:border-slate-900 rounded-full" />
                  )}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3
                      className={`text-sm truncate leading-snug ${
                        hasUnread
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-semibold text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {conv.interlocutorName}
                    </h3>
                    <span className="text-[13px] text-slate-700 dark:text-slate-300 shrink-0 font-medium tabular-nums">
                      <bdi dir="ltr">{formatConversationTime(conv.lastMessageTime)}</bdi>
                    </span>
                  </div>

                  {conv.interlocutorRole && (
                    <p className="text-[13px] text-slate-700 dark:text-slate-300 truncate mb-1">
                      {conv.interlocutorRole}
                      {conv.interlocutorDepartment && ` • ${conv.interlocutorDepartment}`}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? 'text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {conv.lastMessage || t('messages.attachmentOrDoc')}
                    </p>

                    {hasUnread && (
                      <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-[#FFCB56] text-[#1a202c] shadow-2xs shrink-0 tabular-nums">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;

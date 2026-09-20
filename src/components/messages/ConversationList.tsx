import React, { useState } from 'react';
import { Search, MessageSquare, Shield, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { ConversationData } from '@/components/messages/ConversationThread';

export interface ConversationListProps {
  conversations: ConversationData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const formatConversationTime = (dateStr?: Date | string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
    } catch {
      return '';
    }
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
    <div className="h-full flex flex-col bg-white overflow-hidden select-none" dir="rtl">
      {/* Search Header */}
      <div className="p-3 border-b border-[#e2e8f0] bg-white">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="بحث في المحادثات أو الأسماء..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs text-right pr-9 pl-3 border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded-lg bg-[#f7fafc]"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="animate-spin inline-block w-5 h-5 border-2 border-[#2c5282] border-t-transparent rounded-full mb-2" />
            <p>جارٍ تحميل المحادثات...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-48">
            <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
            <p className="font-medium text-slate-700 mb-1">
              {searchTerm ? 'لا توجد نتائج بحث مطابقة' : 'لا توجد محادثات حتى الآن'}
            </p>
            <p className="text-slate-400">
              {searchTerm ? 'جرب البحث بكلمات أخرى' : 'انقر على "رسالة جديدة" لبدء محادثة'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedId === conv.interlocutorId;
            const hasUnread = (conv.unreadCount || 0) > 0;

            return (
              <div
                key={conv.interlocutorId}
                onClick={() => onSelect(conv.interlocutorId)}
                className={`min-h-[72px] p-3 flex items-start gap-3 cursor-pointer transition-colors duration-150 border-r-4 ${
                  isSelected
                    ? 'bg-[#ebf4ff] border-r-[#2c5282]'
                    : 'border-r-transparent hover:bg-[#f7fafc]'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 pt-0.5">
                  <PersonnelAvatar
                    photo={conv.interlocutorPhoto}
                    username={conv.interlocutorUsername || conv.interlocutorName}
                    size="md"
                    className="w-10 h-10 ring-1 ring-slate-200"
                  />
                  {hasUnread && (
                    <span className="absolute -top-1 -left-1 w-3 h-3 bg-[#FFCB56] border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3
                      className={`text-[14px] truncate leading-snug ${
                        hasUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {conv.interlocutorName}
                    </h3>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                      {formatConversationTime(conv.lastMessageTime)}
                    </span>
                  </div>

                  {conv.interlocutorRole && (
                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {conv.interlocutorRole}
                      {conv.interlocutorDepartment && ` - ${conv.interlocutorDepartment}`}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-[12px] truncate ${
                        hasUnread ? 'text-slate-900 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {conv.lastMessage || 'مرفق أو مستند'}
                    </p>

                    {hasUnread && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFCB56] text-[#1a202c] shadow-2xs shrink-0">
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

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMessages, 
  markAsRead, 
  markAllAsRead, 
  deleteMessage as deleteMessageService 
} from '@/services/messageService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Inbox, 
  Send, 
  Users, 
  Plus, 
  RefreshCw, 
  Search, 
  CheckCheck, 
  MessageSquare, 
  AlertCircle,
  MailCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import ComposeMessage from '@/components/messages/ComposeMessage';
import MessageThread from '@/components/messages/MessageThread';
import ContactsList from '@/components/messages/ContactsList';
import MessagesList from '@/components/messages/MessagesList';
import MessageComposer from '@/components/messages/MessageComposer';
import MessageHistoryStats from '@/components/messages/MessageHistoryStats';
import CrossRoleMessagingInfo from '@/components/messages/CrossRoleMessagingInfo';

type ActiveTab = 'inbox' | 'sent' | 'contacts';

const MessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeRecipients, setComposeRecipients] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickComposer, setShowQuickComposer] = useState(false);

  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Load messages based on activeTab (inbox / sent)
  const { 
    data: messagesResponse, 
    isLoading, 
    isFetching, 
    refetch, 
    error 
  } = useQuery({
    queryKey: ['messages', activeTab === 'contacts' ? 'inbox' : activeTab],
    queryFn: () => getMessages(activeTab === 'contacts' ? 'inbox' : activeTab),
    retry: 2,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const messages = messagesResponse?.data || [];
  const messageStats = {
    totalMessages: messagesResponse?.count || messages.length || 0,
    unreadCount: messagesResponse?.unreadCount || 0,
    oneToOneCount: messagesResponse?.oneToOneCount || 0,
    groupCount: messagesResponse?.groupCount || 0
  };

  // Mark single message as read
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  // Mark all messages as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديد كافة الرسائل كمقروءة"
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر تحديث حالة القراءة",
        variant: "destructive"
      });
    }
  });

  // Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: deleteMessageService,
    onSuccess: () => {
      toast({
        title: t('messages.messageDeleted'),
        description: t('messages.messageDeletedPermanently')
      });
      setSelectedMessageId(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر حذف الرسالة",
        variant: "destructive"
      });
    }
  });

  const { mutate: markSingleAsRead } = markAsReadMutation;

  useEffect(() => {
    if (selectedMessageId && activeTab === 'inbox') {
      markSingleAsRead(selectedMessageId);
    }
  }, [selectedMessageId, activeTab, markSingleAsRead]);

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: t('messages.messagesUpdated'),
      description: t('messages.messagesListUpdated')
    });
  };

  const handleDeleteMessage = async (id?: string) => {
    const targetId = id || selectedMessageId;
    if (!targetId) return;
    deleteMessageMutation.mutate(targetId);
  };

  const handleReply = (message: Message) => {
    if (typeof message.sender === 'object') {
      setComposeRecipients([message.sender]);
    }
    setIsComposing(true);
  };

  const handleComposeMessage = (recipients: User[] = []) => {
    setComposeRecipients(recipients);
    setIsComposing(true);
  };

  const handleMessageSent = () => {
    refetch();
    setIsComposing(false);
    setShowQuickComposer(false);
    setActiveTab('sent');
  };

  const handleSelectUserFromContacts = (user: User) => {
    setComposeRecipients([user]);
    setIsComposing(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 text-right" dir="rtl">
      {/* Top Header Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 mb-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded text-[#2c5282]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  {t('messages.title')}
                </h1>
                {messageStats.unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                    {messageStats.unreadCount} {t('messages.unread')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                منظومة المراسلات الإدارية الرسمية والتنسيق بين الأقسام
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              onClick={() => handleComposeMessage()}
              className="h-8 px-3.5 text-xs font-medium rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('messages.newMessage')}</span>
            </Button>

            {messageStats.unreadCount > 0 && activeTab === 'inbox' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="h-8 px-2.5 text-xs rounded border-[#FFCB56] bg-[#FFD758]/15 text-[#78350f] hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1.5 font-medium"
                title="تحديد الكل كمقروء"
              >
                <MailCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديد الكل كمقروء</span>
              </Button>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isFetching}
              className="h-8 px-2.5 text-xs rounded border-[#cbd5e1] text-slate-700 hover:bg-slate-100 transition-colors duration-200 flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${(isLoading || isFetching) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('messages.refresh')}</span>
            </Button>
          </div>
        </div>

        {/* Onglets Reçus / Envoyés / Contacts */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#edf2f7]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('inbox');
              setIsComposing(false);
              setSelectedMessageId(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'inbox' && !isComposing
                ? 'bg-[#2c5282] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>الرسائل الواردة (Reçus)</span>
            {messageStats.unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'inbox' && !isComposing
                  ? 'bg-[#FFCB56] text-[#78350f]'
                  : 'bg-[#FFCB56] text-[#78350f]'
              }`}>
                {messageStats.unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sent');
              setIsComposing(false);
              setSelectedMessageId(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'sent' && !isComposing
                ? 'bg-[#2c5282] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>الرسائل المرسلة (Envoyés)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('contacts');
              setIsComposing(false);
              setSelectedMessageId(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'contacts' && !isComposing
                ? 'bg-[#2c5282] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>دليل جهات الاتصال</span>
          </button>
        </div>
      </div>

      {/* Role Messaging Info Banner */}
      <CrossRoleMessagingInfo />

      {/* Stats Cards */}
      <MessageHistoryStats {...messageStats} />

      {/* Main View Area */}
      {isComposing ? (
        <ComposeMessage
          onClose={() => setIsComposing(false)}
          onMessageSent={handleMessageSent}
          initialRecipients={composeRecipients}
        />
      ) : activeTab === 'contacts' ? (
        <ContactsList
          onSelectUser={handleSelectUserFromContacts}
          onComposeMessage={handleComposeMessage}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Messages Column (List) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <Card className="border border-[#e2e8f0] rounded bg-white shadow-xs overflow-hidden">
              {/* List Header & Search */}
              <div className="p-3 border-b border-[#e2e8f0] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {activeTab === 'inbox' ? 'صندوق الوارد' : 'صندوق المرسل'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {messages.length} رسالة
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="بحث في الرسائل أو المرسل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-xs text-right pr-8 border-[#cbd5e1] focus:border-[#2c5282] rounded"
                  />
                </div>
              </div>

              {/* Messages list container */}
              <div className="max-h-[640px] overflow-y-auto">
                <MessagesList
                  onSelectMessage={handleSelectMessage}
                  selectedMessageId={selectedMessageId}
                  searchTerm={searchTerm}
                  activeTab={activeTab}
                />
              </div>
            </Card>
          </div>

          {/* Message Thread Preview / Detail Column */}
          <div className="lg:col-span-7 xl:col-span-8">
            {selectedMessageId ? (
              <div className="bg-white border border-[#e2e8f0] rounded shadow-xs overflow-hidden">
                <MessageThread
                  messageId={selectedMessageId}
                  onBack={() => setSelectedMessageId(null)}
                  onReply={handleReply}
                  onDelete={handleDeleteMessage}
                />
              </div>
            ) : (
              <div className="bg-white border border-[#e2e8f0] rounded shadow-xs p-10 text-center min-h-[420px] flex flex-col items-center justify-center">
                <div className="p-3 bg-slate-100 rounded text-slate-400 mb-3">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  {t('messages.selectMessage')}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                  اختر رسالة من القائمة لعرض كامل تفاصيلها ومرفقاتها والرد عليها رسمياً
                </p>
                <Button 
                  onClick={() => handleComposeMessage()}
                  className="h-8 px-4 text-xs font-medium rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t('messages.newMessage')}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Composer Modal if opened */}
      {showQuickComposer && (
        <MessageComposer
          onClose={() => setShowQuickComposer(false)}
          onMessageSent={handleMessageSent}
        />
      )}
    </div>
  );
};

export default MessagesPage;

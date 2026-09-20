import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMessages, 
  sendMessage,
  markAsRead, 
  markAllAsRead, 
} from '@/services/messageService';
import { Button } from '@/components/ui/button';
import { 
  Inbox, 
  Send, 
  Users, 
  Plus, 
  RefreshCw, 
  MessageSquare, 
  MailCheck
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import ComposeMessage from '@/components/messages/ComposeMessage';
import ContactsList from '@/components/messages/ContactsList';
import MessageComposer from '@/components/messages/MessageComposer';
import MessageHistoryStats from '@/components/messages/MessageHistoryStats';
import CrossRoleMessagingInfo from '@/components/messages/CrossRoleMessagingInfo';
import ConversationList from '@/components/messages/ConversationList';
import ConversationThread, { ConversationData } from '@/components/messages/ConversationThread';

type ActiveTab = 'inbox' | 'sent' | 'contacts';

interface InterlocutorDetails {
  _id: string;
  username?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  photo?: string | null;
  department?: string | { name?: string };
}

const MessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [composeRecipients, setComposeRecipients] = useState<User[]>([]);
  const [showQuickComposer, setShowQuickComposer] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const currentUserId = String(currentUser?._id || (currentUser as User & { id?: string })?.id || '');

  // Load all messages (inbox + sent)
  const { 
    data: messagesResponse, 
    isLoading, 
    isFetching, 
    refetch, 
  } = useQuery({
    queryKey: ['messages', 'all'],
    queryFn: () => getMessages('all'),
    retry: 2,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const messages: Message[] = useMemo(() => {
    return Array.isArray(messagesResponse?.data) ? messagesResponse.data : [];
  }, [messagesResponse?.data]);

  const messageStats = {
    totalMessages: messagesResponse?.count || messages.length || 0,
    unreadCount: messagesResponse?.unreadCount || 0,
    oneToOneCount: messagesResponse?.oneToOneCount || 0,
    groupCount: messagesResponse?.groupCount || 0
  };

  // Group messages into conversations by interlocutor
  const allConversations = useMemo(() => {
    if (!messages.length) return [];

    const convMap = new Map<string, ConversationData>();

    messages.forEach((msg: Message) => {
      const isSender = msg.isSender ?? (
        typeof msg.sender === 'object'
          ? String(msg.sender?._id) === currentUserId
          : String(msg.sender) === currentUserId
      );

      let interlocutor: InterlocutorDetails | null = null;

      if (isSender) {
        // If current user is sender, the interlocutor is the recipient
        if (Array.isArray(msg.recipients) && msg.recipients.length > 0) {
          const rec = msg.recipients[0]?.user;
          if (rec && typeof rec === 'object') {
            interlocutor = rec as InterlocutorDetails;
          }
        }
      } else {
        // If current user received it, the interlocutor is the sender
        if (msg.sender && typeof msg.sender === 'object') {
          interlocutor = msg.sender as InterlocutorDetails;
        }
      }

      if (!interlocutor) return;

      const interlocutorId = String(interlocutor._id);
      if (!interlocutorId || interlocutorId === currentUserId) return;

      const interlocutorName = interlocutor.nom && interlocutor.prenom
        ? `${interlocutor.prenom} ${interlocutor.nom}`
        : (interlocutor.username || 'مستخدم');

      const interlocutorRole = interlocutor.role;
      const interlocutorPhoto = interlocutor.photo;
      const interlocutorUsername = interlocutor.username;
      const interlocutorDepartment = typeof interlocutor.department === 'object'
        ? interlocutor.department?.name
        : interlocutor.department;

      const isUnread = !isSender && !msg.isRead;

      if (!convMap.has(interlocutorId)) {
        convMap.set(interlocutorId, {
          interlocutorId,
          interlocutorName,
          interlocutorRole,
          interlocutorPhoto,
          interlocutorUsername,
          interlocutorDepartment,
          lastMessage: msg.content || msg.subject || '',
          lastMessageTime: msg.createdAt,
          unreadCount: isUnread ? 1 : 0,
          messages: [msg],
        });
      } else {
        const existing = convMap.get(interlocutorId)!;
        existing.messages.push(msg);
        if (isUnread) {
          existing.unreadCount = (existing.unreadCount || 0) + 1;
        }
        if (new Date(msg.createdAt).getTime() > new Date(existing.lastMessageTime || 0).getTime()) {
          existing.lastMessage = msg.content || msg.subject || '';
          existing.lastMessageTime = msg.createdAt;
        }
      }
    });

    // Sort: unread first, then by latest message date descending
    return Array.from(convMap.values()).sort((a, b) => {
      if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
      if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
      return new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime();
    });
  }, [messages, currentUserId]);

  // Filter conversations according to tab (if 'sent', show conversations where user sent messages)
  const conversations = useMemo(() => {
    if (activeTab === 'sent') {
      return allConversations.filter((conv) =>
        conv.messages.some((m: Message) => {
          if (m.isSender !== undefined) return m.isSender;
          const senderId = typeof m.sender === 'object' ? m.sender?._id : m.sender;
          return String(senderId) === currentUserId;
        })
      );
    }
    return allConversations;
  }, [allConversations, activeTab, currentUserId]);

  // Selected conversation object
  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return allConversations.find((c) => c.interlocutorId === selectedConversationId) || null;
  }, [allConversations, selectedConversationId]);

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
      refetch();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر تحديث حالة القراءة",
        variant: "destructive"
      });
    }
  });

  const { mutate: markSingleAsRead } = markAsReadMutation;

  // When a conversation with unread messages is selected, automatically mark them as read
  useEffect(() => {
    if (selectedConversation && (selectedConversation.unreadCount || 0) > 0) {
      const unreadMsgs = selectedConversation.messages.filter((m: Message) => {
        const isSender = m.isSender ?? (
          typeof m.sender === 'object'
            ? String(m.sender?._id) === currentUserId
            : String(m.sender) === currentUserId
        );
        return !isSender && !m.isRead;
      });

      unreadMsgs.forEach((m: Message) => {
        markSingleAsRead(m._id);
      });
    }
  }, [selectedConversation, currentUserId, markSingleAsRead]);

  const handleRefresh = () => {
    refetch();
    toast({
      title: t('messages.messagesUpdated'),
      description: t('messages.messagesListUpdated')
    });
  };

  const handleComposeMessage = (recipients: User[] = []) => {
    setComposeRecipients(recipients);
    setIsComposing(true);
  };

  const handleMessageSent = () => {
    refetch();
    setIsComposing(false);
    setShowQuickComposer(false);
  };

  const handleSelectUserFromContacts = (user: User) => {
    const existingConv = allConversations.find((c) => c.interlocutorId === user._id);
    if (existingConv) {
      setSelectedConversationId(user._id);
      setMobileShowThread(true);
      setActiveTab('inbox');
    } else {
      setComposeRecipients([user]);
      setIsComposing(true);
    }
  };

  // Quick send from chat thread
  const handleSendMessageFromThread = async (content: string, files: File[]) => {
    if (!selectedConversation) return;

    try {
      setIsSending(true);
      const lastMsg = selectedConversation.messages?.[selectedConversation.messages.length - 1];
      const lastSubject = lastMsg?.subject;
      const subject = lastSubject
        ? (lastSubject.startsWith('Re: ') ? lastSubject : `Re: ${lastSubject}`)
        : 'محادثة فورية';

      await sendMessage(
        [selectedConversation.interlocutorId],
        subject,
        content,
        files.length > 0 ? files : undefined,
        'normal'
      );

      queryClient.invalidateQueries({ queryKey: ['messages'] });
      await refetch();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "خطأ",
        description: errorObj?.response?.data?.message || errorObj?.message || "تعذر إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 text-right" dir="rtl">
      {/* Top Header Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 mb-4 shadow-xs">
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
              className="h-11 px-3.5 text-xs font-medium rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('messages.newMessage')}</span>
            </Button>

            {messageStats.unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                aria-label="تحديد الكل كمقروء"
                className="h-11 px-2.5 text-xs rounded border-[#FFCB56] bg-[#FFD758]/15 text-[#78350f] hover:bg-[#FFD758]/30 transition-colors duration-200 flex items-center gap-1.5 font-medium"
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
              className="h-11 px-2.5 text-xs rounded border-[#cbd5e1] text-slate-700 hover:bg-slate-100 transition-colors duration-200 flex items-center gap-1"
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
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'inbox' && !isComposing
                ? 'bg-[#2c5282] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>المحادثات والوارد</span>
            {messageStats.unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FFCB56] text-[#78350f]">
                {messageStats.unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sent');
              setIsComposing(false);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors duration-200 flex items-center gap-2 ${
              activeTab === 'sent' && !isComposing
                ? 'bg-[#2c5282] text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>المرسلة (Envoyés)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('contacts');
              setIsComposing(false);
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
        /* Modern 2-Column Chat Layout */
        <div className="flex h-[calc(100vh-250px)] min-h-[550px] border border-[#e2e8f0] rounded-lg overflow-hidden bg-white shadow-xs">
          {/* Left Column: Conversations List (35%) */}
          <div
            className={`w-full md:w-[35%] border-l border-[#e2e8f0] flex flex-col ${
              mobileShowThread ? 'hidden md:flex' : 'flex'
            }`}
          >
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={(id) => {
                setSelectedConversationId(id);
                setMobileShowThread(true);
              }}
              loading={isLoading}
            />
          </div>

          {/* Right Column: Chat Thread & Bubbles (65%) */}
          <div
            className={`flex-1 flex flex-col ${
              mobileShowThread ? 'flex' : 'hidden md:flex'
            }`}
          >
            <ConversationThread
              conversation={selectedConversation}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessageFromThread}
              onBack={() => setMobileShowThread(false)}
              isSending={isSending}
            />
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

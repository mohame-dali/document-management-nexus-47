
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMessages, markAsRead, deleteMessage as deleteMessageService } from '@/services/messageService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, RefreshCw, Search, Plus, MessageSquare, Inbox, Send, Sparkles, Users } from 'lucide-react';
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

type ViewMode = 'inbox' | 'compose' | 'thread' | 'contacts';

const MessagesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [composeRecipients, setComposeRecipients] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickComposer, setShowQuickComposer] = useState(false);

  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: messagesResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['messages'],
    queryFn: getMessages,
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const messages = messagesResponse?.data || [];
  const messageStats = {
    totalMessages: messagesResponse?.count || 0,
    unreadCount: messagesResponse?.unreadCount || 0,
    oneToOneCount: messagesResponse?.oneToOneCount || 0,
    groupCount: messagesResponse?.groupCount || 0
  };

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      console.error('خطأ في تحديد الرسالة كمقروءة:', error);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: deleteMessageService,
    onSuccess: () => {
      toast({
        title: t('messages.messageDeleted'),
        description: t('messages.messageDeletedPermanently')
      });
      setViewMode('inbox');
      setSelectedMessageId(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      console.error('خطأ في حذف الرسالة:', error);
      toast({
        title: "خطأ",
        description: t('messages.sendError'),
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (selectedMessageId && viewMode === 'thread') {
      markAsReadMutation.mutate(selectedMessageId);
    }
  }, [selectedMessageId, viewMode]);

  const handleSelectMessage = (id: string) => {
    setSelectedMessageId(id);
    setViewMode('thread');
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: t('messages.messagesUpdated'),
      description: t('messages.messagesListUpdated')
    });
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    deleteMessageMutation.mutate(selectedMessageId);
  };

  const handleReply = (message: Message) => {
    if (typeof message.sender === 'object') {
      setComposeRecipients([message.sender]);
    }
    setViewMode('compose');
  };

  const handleComposeMessage = (recipients: User[] = []) => {
    setComposeRecipients(recipients);
    setViewMode('compose');
  };

  const handleMessageSent = () => {
    refetch();
    setViewMode('inbox');
    setShowQuickComposer(false);
  };

  const handleSelectUser = (user: User) => {
    setComposeRecipients([user]);
    setViewMode('compose');
  };

  const getUnreadCount = () => {
    if (!currentUser?._id) return 0;
    
    return messages.filter((message: Message) => {
      // Check if the message has an isRead property
      if ('isRead' in message && typeof message.isRead === 'boolean') {
        return !message.isRead;
      }
      
      // Check recipients array
      if (Array.isArray(message.recipients)) {
        const recipient = message.recipients.find((r: any) => {
          if (typeof r === 'object' && r.user) {
            const userId = typeof r.user === 'object' ? r.user._id : r.user;
            return userId === currentUser._id;
          }
          return false;
        });
        return recipient ? !recipient.read : false;
      }
      
      return false;
    }).length;
  };

  const getWelcomeMessage = () => {
    const role = currentUser?.role;
    switch (role) {
      case 'Admin':
        return 'مركز الرسائل للتواصل على مستوى النظام';
      case 'AdminTuningDesk':
        return 'مركز التواصل لتنسيق معالجة الوثائق';
      case 'AdminDepartment':
        return `مركز التواصل الإداري لـ ${currentUser?.activeDepartment?.name || 'قسمك'}`;
      case 'User':
        return 'مركز الرسائل الشخصي الخاص بك';
      default:
        return 'مرحباً بك في نظام الرسائل';
    }
  };

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6" dir="rtl">
        <Card className="p-8 border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <div className="text-center text-red-500">
            <div className="p-4 bg-red-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-12 w-12 text-red-400" />
            </div>
            <p className="text-xl font-bold mb-2 text-red-700">{t('messages.error')}</p>
            <p className="text-sm text-gray-600 mb-6">
              {t('messages.networkError')}
            </p>
            <Button onClick={handleRefresh} variant="outline" className="hover:bg-red-50 border-red-200">
              <RefreshCw className="h-4 w-4 ml-2" />
              {t('messages.tryAgain')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6" dir="rtl">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl shadow-lg">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('messages.title')}
                </h1>
                <p className="text-gray-600 font-medium">نظام إدارة الرسائل المتطور</p>
              </div>
            </div>
            {messageStats.unreadCount > 0 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full animate-pulse shadow-lg">
                <Sparkles className="h-4 w-4" />
                <span className="font-bold">{messageStats.unreadCount}</span>
                <span className="text-sm">{t('messages.unread')}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant={viewMode === 'inbox' ? 'default' : 'outline'}
              onClick={() => setViewMode('inbox')}
              className={`${viewMode === 'inbox' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg' 
                : 'border-2 hover:bg-blue-50 hover:border-blue-300'
              } transition-all duration-200 h-11 px-6`}
            >
              <Inbox className="h-4 w-4 ml-2" />
              {t('messages.inbox')}
            </Button>
            <Button 
              variant={viewMode === 'contacts' ? 'default' : 'outline'} 
              onClick={() => setViewMode('contacts')}
              className={`${viewMode === 'contacts' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg' 
                : 'border-2 hover:bg-green-50 hover:border-green-300'
              } transition-all duration-200 h-11 px-6`}
            >
              <Users className="h-4 w-4 ml-2" />
              {t('messages.contacts')}
            </Button>
            <Button 
              variant="default" 
              onClick={() => handleComposeMessage()}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg transition-all duration-200 h-11 px-6"
            >
              <Plus className="h-4 w-4 ml-2" />
              {t('messages.newMessage')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 h-11 px-6"
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('messages.refresh')}
            </Button>
          </div>
        </div>

        {/* Enhanced Welcome message */}
        <Card className="mt-6 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
          <div className="p-6 flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium">{getWelcomeMessage()}</p>
          </div>
        </Card>
      </div>

      {/* Cross-role messaging info and stats */}
      <div className="mb-6 space-y-4">
        <CrossRoleMessagingInfo />
        <MessageHistoryStats {...messageStats} />
      </div>

      {/* Main Content */}
      {viewMode === 'compose' && (
        <ComposeMessage
          onClose={() => setViewMode('inbox')}
          onMessageSent={handleMessageSent}
        />
      )}

      {viewMode === 'thread' && selectedMessageId && (
        <MessageThread
          messageId={selectedMessageId}
          onBack={() => setViewMode('inbox')}
          onReply={handleReply}
          onDelete={handleDeleteMessage}
        />
      )}

      {viewMode === 'contacts' && (
        <ContactsList
          onSelectUser={handleSelectUser}
          onComposeMessage={handleComposeMessage}
        />
      )}

      {viewMode === 'inbox' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Enhanced Messages List */}
          <div className="xl:col-span-1">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-100 to-gray-100 p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-blue-600" />
                    {t('messages.title')}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQuickComposer(true)}
                    className="hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Enhanced Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('messages.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 text-right border-2 border-gray-200 focus:border-blue-400 bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm text-gray-500">جاري التحميل...</p>
                    </div>
                  </div>
                ) : (
                  <MessagesList
                    onSelectMessage={handleSelectMessage}
                    selectedMessageId={selectedMessageId}
                    searchTerm={searchTerm}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Enhanced Message Preview */}
          <div className="xl:col-span-2">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm h-[700px] overflow-hidden">
              {selectedMessageId ? (
                <MessageThread
                  messageId={selectedMessageId}
                  onBack={() => setSelectedMessageId(null)}
                  onReply={handleReply}
                  onDelete={handleDeleteMessage}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gradient-to-br from-gray-50 to-slate-100">
                  <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 bg-blue-50 rounded-full mb-4">
                        <MessageSquare className="h-12 w-12 text-blue-400" />
                      </div>
                      <p className="text-xl font-bold text-gray-700 mb-2">{t('messages.selectMessage')}</p>
                      <p className="text-sm text-gray-500 max-w-md leading-relaxed mb-6">
                        اختر رسالة من صندوق الوارد لقراءة محتواها أو الرد عليها أو إدارتها
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => handleComposeMessage()}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:from-blue-700 hover:to-indigo-700 shadow-lg px-6 py-3"
                      >
                        <Plus className="h-4 w-4 ml-2" />
                        {t('messages.newMessage')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Quick Composer */}
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

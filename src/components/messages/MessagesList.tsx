
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MessageSquare, Clock, User, Sparkles } from 'lucide-react';
import { getMessages } from '@/services/messageService';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';

interface MessagesListProps {
  onSelectMessage: (messageId: string) => void;
  selectedMessageId?: string;
  searchTerm?: string;
}

const MessagesList: React.FC<MessagesListProps> = ({ 
  onSelectMessage, 
  selectedMessageId,
  searchTerm = ''
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  
  const { data: messagesResponse, isLoading, error } = useQuery({
    queryKey: ['messages'],
    queryFn: getMessages
  });

  const messages = messagesResponse?.data || [];

  const filteredMessages = messages.filter((message: Message) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const subjectMatch = message.subject?.toLowerCase().includes(searchLower);
    const contentMatch = message.content?.toLowerCase().includes(searchLower);
    
    let senderMatch = false;
    if (typeof message.sender === 'object' && message.sender?.username) {
      senderMatch = message.sender.username.toLowerCase().includes(searchLower);
    }
    
    return subjectMatch || contentMatch || senderMatch;
  });

  const isMessageRead = (message: Message): boolean => {
    if (!currentUser?._id) return false;
    
    // Check if the message has an isRead property
    if ('isRead' in message && typeof message.isRead === 'boolean') {
      return message.isRead;
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
      return recipient ? !!recipient.read : false;
    }
    
    return false;
  };

  const getSenderName = (message: Message): string => {
    if (typeof message.sender === 'object' && message.sender?.username) {
      return message.sender.username;
    }
    return t('messages.unknownUser');
  };

  const getSenderPhoto = (message: Message): string => {
    if (typeof message.sender === 'object' && message.sender?.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${API_URL}${message.sender.photo}`;
    }
    return '';
  };

  const getSenderRole = (message: Message): string => {
    if (typeof message.sender === 'object' && message.sender?.role) {
      return message.sender.role;
    }
    return 'User';
  };

  const getRecipientCount = (message: Message): number => {
    if (Array.isArray(message.recipients)) {
      return message.recipients.length;
    }
    return 0;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300';
      case 'AdminDepartment':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300';
      case 'AdminTuningDesk':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300';
      case 'User':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="border-0 shadow-sm bg-gray-50">
            <CardContent className="p-4">
              <div className="animate-pulse flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-4 border-0 shadow-lg bg-red-50">
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-lg font-bold mb-2 text-red-700">{t('messages.error')}</p>
            <p className="text-sm text-red-600">{t('messages.tryAgain')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <Card className="m-4 border-0 shadow-lg bg-gray-50">
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-bold mb-2 text-gray-700">
              {searchTerm ? 'لم يتم العثور على رسائل' : t('messages.noMessages')}
            </p>
            <p className="text-sm text-gray-500">
              {searchTerm 
                ? t('messages.adjustSearch')
                : 'ابدأ محادثة بإرسال أول رسالة لك'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {filteredMessages.map((message: Message) => (
        <Card 
          key={message._id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 ${
            selectedMessageId === message._id 
              ? 'ring-2 ring-blue-500 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50' 
              : 'bg-white hover:bg-gray-50 shadow-sm'
          }`}
          onClick={() => onSelectMessage(message._id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                  {getSenderPhoto(message) ? (
                    <AvatarImage 
                      src={getSenderPhoto(message)} 
                      alt={getSenderName(message)}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className={`font-bold text-sm ${getRoleColor(getSenderRole(message))}`}>
                    {getSenderName(message).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isMessageRead(message) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse shadow-lg">
                    <Sparkles className="h-2 w-2 text-white absolute top-1 left-1" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm truncate text-gray-800">
                      {getSenderName(message)}
                    </span>
                    <Badge className={`text-xs border ${getRoleColor(getSenderRole(message))}`}>
                      {getRoleDisplayName(getSenderRole(message))}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isMessageRead(message) && (
                      <Badge className="text-xs bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-sm animate-pulse">
                        <Sparkles className="h-2 w-2 mr-1" />
                        {t('messages.new')}
                      </Badge>
                    )}
                    {getRecipientCount(message) > 1 && (
                      <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">
                        <User className="h-3 w-3 mr-1" />
                        {getRecipientCount(message)}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-sm mb-2 truncate text-gray-800">
                  {message.subject || t('messages.noSubject')}
                </h3>
                
                <p className="text-xs text-gray-600 truncate mb-3 leading-relaxed">
                  {message.content || t('messages.noContent')}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3 mr-1" />
                    {message.createdAt ? 
                      formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ar }) :
                      t('messages.unknownTime')
                    }
                  </div>
                  {message.attachments && message.attachments.length > 0 && (
                    <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                      📎 {message.attachments.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MessagesList;

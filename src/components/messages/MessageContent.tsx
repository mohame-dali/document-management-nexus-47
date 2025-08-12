
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatArabicDateTime } from '@/utils/arabicDateFormatter';
import { Message, User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface MessageContentProps {
  message: Message;
}

const MessageContent: React.FC<MessageContentProps> = ({ message }) => {
  const { t } = useLanguage();

  const getSenderName = (sender: User | string): string => {
    if (typeof sender === 'object' && sender) {
      return sender.username || t('messages.unknownUser');
    }
    return t('messages.unknownUser');
  };

  const getSenderPhoto = (sender: User | string): string => {
    if (typeof sender === 'object' && sender?.photo) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      return `${API_URL}${sender.photo}`;
    }
    return '';
  };

  const getSenderRole = (sender: User | string): string => {
    if (typeof sender === 'object' && sender) {
      return sender.role || 'User';
    }
    return 'User';
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
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

  const getRecipientNames = (recipients: Message['recipients']): string => {
    if (!Array.isArray(recipients)) return t('messages.unknownUser');
    
    return recipients
      .map(recipient => {
        if (typeof recipient === 'object' && recipient.user) {
          if (typeof recipient.user === 'object') {
            return recipient.user.username || t('messages.unknownUser');
          }
        }
        return t('messages.unknownUser');
      })
      .join(', ');
  };

  return (
    <>
      {/* Enhanced Message Header */}
      <div className="space-y-6 mb-8 bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{message.subject}</h1>
        
        <div className="flex items-start space-x-4 space-x-reverse">
          <div className="relative">
            <Avatar className="h-14 w-14 border-3 border-white shadow-lg">
              {getSenderPhoto(message.sender) ? (
                <AvatarImage 
                  src={getSenderPhoto(message.sender)} 
                  alt={getSenderName(message.sender)}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className={`font-bold text-lg ${getRoleColor(getSenderRole(message.sender))}`}>
                {getSenderName(message.sender).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 space-x-reverse mb-2">
              <span className="font-bold text-lg text-gray-800">{getSenderName(message.sender)}</span>
              <Badge className={`text-sm border ${getRoleColor(getSenderRole(message.sender))}`}>
                {getRoleDisplayName(getSenderRole(message.sender))}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mb-2 bg-white px-3 py-1 rounded-lg border">
              <strong>{t('messages.to')}:</strong> {getRecipientNames(message.recipients)}
            </div>
            <div className="text-sm text-gray-500 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              {formatArabicDateTime(message.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Message Content */}
      <div className="prose max-w-none mb-6">
        <div className="whitespace-pre-wrap bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border-2 border-gray-200 text-right shadow-sm">
          <p className="text-gray-800 leading-relaxed">{message.content}</p>
        </div>
      </div>
    </>
  );
};

export default MessageContent;

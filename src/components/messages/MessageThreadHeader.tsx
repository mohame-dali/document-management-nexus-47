
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Reply, 
  Trash2, 
  Clock,
  User,
  Shield,
  Building2,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

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
      case 'Admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'AdminDepartment': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'AdminTuningDesk': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const senderInfo = message.sender && typeof message.sender === 'object' ? message.sender : null;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="flex items-center gap-2 hover:bg-blue-100 hover:text-blue-700 transition-colors duration-200 px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">{t('messages.backToMessages')}</span>
        </Button>
        
        <div className="flex flex-wrap gap-2">
          {onReply && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onReply(message)}
              className="flex items-center gap-2 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors duration-200"
            >
              <Reply className="h-4 w-4" />
              <span className="hidden sm:inline">{t('messages.reply')}</span>
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors duration-200"
              onClick={() => onDelete(message._id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('messages.delete')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Message Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Message Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-3 leading-relaxed">
              {message.subject}
            </h2>
            
            {/* Message Type Badge */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge 
                variant="secondary" 
                className={`px-3 py-1 text-xs font-medium ${
                  message.messageType === 'one-to-many' 
                    ? 'bg-purple-100 text-purple-700 border-purple-200' 
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}
              >
                {message.messageType === 'one-to-many' ? 'رسالة جماعية' : 'رسالة فردية'}
              </Badge>
              
              {message.crossDepartment && (
                <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-xs font-medium">
                  عبر الأقسام
                </Badge>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatArabicDate(message.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Sender & Recipients Info */}
        <div className="space-y-4">
          {/* Sender Info */}
          {senderInfo && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">المرسل</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getRoleIcon(senderInfo.role)}
                  <span className="font-semibold text-gray-800">{senderInfo.username}</span>
                </div>
                <Badge className={`text-xs px-2 py-1 border ${getRoleColor(senderInfo.role)}`}>
                  {getRoleDisplayName(senderInfo.role)}
                </Badge>
              </div>
            </div>
          )}

          {/* Recipients Info */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                المستقبلون ({message.recipients?.length || 0})
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {message.recipients?.map((recipient, index) => {
                const recipientUser = recipient.user && typeof recipient.user === 'object' ? recipient.user : null;
                if (!recipientUser) return null;
                
                return (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(recipientUser.role)}
                      <span className="text-sm font-medium text-gray-700">
                        {recipientUser.username}
                      </span>
                      <Badge className={`text-xs px-2 py-0.5 border ${getRoleColor(recipientUser.role)}`}>
                        {getRoleDisplayName(recipientUser.role)}
                      </Badge>
                    </div>
                    <Badge 
                      variant={recipient.read ? "default" : "secondary"}
                      className={`text-xs px-2 py-0.5 ${
                        recipient.read 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-orange-100 text-orange-700 border-orange-200'
                      }`}
                    >
                      {recipient.read ? 'مقروءة' : 'غير مقروءة'}
                    </Badge>
                  </div>
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

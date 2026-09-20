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
  User as UserIcon,
  AlertCircle
} from 'lucide-react';
import { Message } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatArabicDateTime } from '@/utils/arabicDateFormatter';

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
      case 'AdminDepartment': return 'bg-blue-50 text-[#2c5282] border-blue-200';
      case 'AdminTuningDesk': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  const senderInfo = message.sender && typeof message.sender === 'object' ? message.sender : null;

  return (
    <div className="bg-white border-b border-[#e2e8f0] pb-4 mb-5" dir="rtl">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1.5 h-11 px-3.5 rounded border-[#cbd5e1] text-slate-700 hover:bg-slate-100 transition-colors duration-200 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('messages.backToMessages')}</span>
        </Button>
        
        <div className="flex items-center gap-2">
          {onReply && (
            <Button 
              size="sm" 
              onClick={() => onReply(message)}
              className="flex items-center gap-1.5 h-11 px-3.5 rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 text-xs font-medium"
            >
              <Reply className="h-3.5 w-3.5" />
              <span>{t('messages.reply')}</span>
            </Button>
          )}
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete(message._id)}
              className="flex items-center gap-1.5 h-11 px-3.5 rounded border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors duration-200 text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t('messages.delete')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Subject & Meta */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            {message.subject}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {message.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                <AlertCircle className="h-3 w-3" />
                عاجل جداً
              </span>
            )}
            {message.priority === 'high' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFD758]/25 text-[#92400e] border border-[#FFCB56]">
                أولوية مرتفعة
              </span>
            )}

            <Badge 
              variant="outline" 
              className="px-2 py-0.5 text-xs rounded border-slate-200 bg-slate-50 text-slate-700 font-normal"
            >
              {message.messageType === 'one-to-many' ? 'رسالة جماعية' : 'رسالة فردية'}
            </Badge>

            {message.crossDepartment && (
              <Badge variant="outline" className="bg-blue-50 text-[#2c5282] border-blue-200 px-2 py-0.5 text-xs rounded font-normal">
                عبر الأقسام
              </Badge>
            )}
          </div>
        </div>

        {/* Sender and Recipients Box */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-3 text-xs space-y-2">
          {/* Sender */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">المرسل:</span>
              <span className="font-semibold text-slate-800">
                {senderInfo ? senderInfo.username : t('messages.unknownUser')}
              </span>
              {senderInfo && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 rounded ${getRoleColor(senderInfo.role)}`}>
                  {getRoleIcon(senderInfo.role)}
                  <span className="mr-1">{getRoleDisplayName(senderInfo.role)}</span>
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatArabicDateTime(message.createdAt)}</span>
            </div>
          </div>

          {/* Recipients */}
          <div className="flex items-start gap-2 pt-1 border-t border-[#edf2f7]">
            <span className="text-slate-500 font-medium whitespace-nowrap mt-0.5">المستلمون:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {message.recipients?.map((recipient, index) => {
                const recipientUser = recipient.user && typeof recipient.user === 'object' ? recipient.user : null;
                const recipientName = recipientUser ? recipientUser.username : t('messages.unknownUser');
                const isRead = recipient.read;

                return (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1.5 bg-white border border-[#e2e8f0] px-2 py-0.5 rounded text-[11px] text-slate-700"
                  >
                    <span>{recipientName}</span>
                    {isRead ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                        مقروءة
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#854d0e] bg-[#FFD758]/20 px-1 rounded border border-[#FFCB56]">
                        غير مقروءة
                      </span>
                    )}
                  </span>
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

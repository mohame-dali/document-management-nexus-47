
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, User, Clock, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';

interface MessageHistoryStatsProps {
  totalMessages: number;
  unreadCount: number;
  oneToOneCount: number;
  groupCount: number;
}

const MessageHistoryStats: React.FC<MessageHistoryStatsProps> = ({
  totalMessages,
  unreadCount,
  oneToOneCount,
  groupCount
}) => {
  const { t } = useLanguage();

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" dir="rtl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            إحصائيات الرسائل
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3 space-x-reverse bg-white p-4 rounded-lg shadow-sm border border-blue-100">
            <div className="p-2 bg-blue-100 rounded-full">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('messages.total')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse bg-white p-4 rounded-lg shadow-sm border border-red-100">
            <div className="p-2 bg-red-100 rounded-full">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('messages.unread')}</p>
              <Badge variant={unreadCount > 0 ? "destructive" : "outline"} className="text-lg font-bold px-3 py-1">
                {unreadCount}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse bg-white p-4 rounded-lg shadow-sm border border-green-100">
            <div className="p-2 bg-green-100 rounded-full">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('messages.oneToOne')}</p>
              <p className="text-2xl font-bold text-gray-900">{oneToOneCount}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 space-x-reverse bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="p-2 bg-purple-100 rounded-full">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{t('messages.group')}</p>
              <p className="text-2xl font-bold text-gray-900">{groupCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageHistoryStats;

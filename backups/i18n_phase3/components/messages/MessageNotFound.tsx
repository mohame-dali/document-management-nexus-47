
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';

interface MessageNotFoundProps {
  onBack: () => void;
}

const MessageNotFound: React.FC<MessageNotFoundProps> = ({ onBack }) => {
  const { t } = useLanguage();

  return (
    <Card className="p-6" dir="rtl">
      <div className="text-center text-gray-500">
        <p>{t('messages.messageNotFound')}</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 ml-2" />
          {t('messages.backToMessages')}
        </Button>
      </div>
    </Card>
  );
};

export default MessageNotFound;

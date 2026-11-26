import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface MessageNotFoundProps {
  onBack: () => void;
}

const MessageNotFound: React.FC<MessageNotFoundProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl" dir={dir}>
      <div className="text-center text-slate-500 dark:text-slate-400">
        <p>{t('messages.messageNotFound')}</p>
        <Button
          variant="outline"
          onClick={onBack}
          className="mt-4 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isRTL ? <ArrowRight className="h-4 w-4 me-2" /> : <ArrowLeft className="h-4 w-4 me-2" />}
          {t('messages.backToMessages')}
        </Button>
      </div>
    </Card>
  );
};

export default MessageNotFound;

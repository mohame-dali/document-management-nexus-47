import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Message } from '@/types';
import { getMessage } from '@/services/messageService';
import { useDirection } from '@/i18n/useDirection';
import MessageThreadHeader from './MessageThreadHeader';
import MessageContent from './MessageContent';
import AttachmentsList from './AttachmentsList';
import MessageLoadingState from './MessageLoadingState';
import MessageNotFound from './MessageNotFound';

interface MessageThreadProps {
  messageId: string;
  onBack: () => void;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  messageId,
  onBack,
  onReply,
  onDelete
}) => {
  const { dir } = useDirection();
  const { data: message, isLoading } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => getMessage(messageId),
    enabled: !!messageId
  });

  if (isLoading) {
    return <MessageLoadingState />;
  }

  if (!message) {
    return <MessageNotFound onBack={onBack} />;
  }

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs" dir={dir}>
      <MessageThreadHeader
        onBack={onBack}
        onReply={onReply}
        onDelete={onDelete}
        message={message}
      />

      <Separator className="mb-6 dark:bg-slate-800" />

      <MessageContent message={message} />

      {message.attachments && message.attachments.length > 0 && (
        <>
          <Separator className="my-4 dark:bg-slate-800" />
          <AttachmentsList attachments={message.attachments} />
        </>
      )}
    </Card>
  );
};

export default MessageThread;

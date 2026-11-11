
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Message } from '@/types';
import { getMessage } from '@/services/messageService';
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
    <Card className="p-6" dir="rtl">
      <MessageThreadHeader 
        onBack={onBack}
        onReply={onReply}
        onDelete={onDelete}
        message={message}
      />

      <Separator className="mb-6" />

      <MessageContent message={message} />

      {message.attachments && message.attachments.length > 0 && (
        <>
          <Separator />
          <AttachmentsList attachments={message.attachments} />
        </>
      )}
    </Card>
  );
};

export default MessageThread;

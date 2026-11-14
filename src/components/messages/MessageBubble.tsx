import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Message } from '@/types';
import { deleteMessage } from '@/services/messageService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorMessages';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import AttachmentsList from '@/components/messages/AttachmentsList';
import { useLanguage } from '@/contexts/LanguageProvider';

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const formatTime = (dateStr?: string | Date): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('messages.confirmDeleteSingle'))) return;
    setIsDeleting(true);
    try {
      await deleteMessage(message._id);
      toast.success(`✅ ${t('messages.messageDeleted')}`);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    } catch (error) {
      toast.error(`❌ ${t('messages.deleteError')}`, { description: getErrorMessage(error) });
    } finally {
      setIsDeleting(false);
    }
  };

  const currentUserId = currentUser?._id || (currentUser as { id?: string })?.id;
  const isSender = typeof message.sender === 'object'
    ? (message.sender?._id?.toString() === currentUserId?.toString())
    : (message.sender?.toString() === currentUserId?.toString());

  const isOwnMessage = isOwn || isSender;

  const isRead = Array.isArray(message.recipients) && message.recipients.length > 0
    ? message.recipients.every((r: { read?: boolean }) => r.read)
    : false;

  const sender = typeof message.sender === 'object' ? message.sender : null;
  const senderPhoto = sender?.photo || sender?.avatar;
  const senderInitial = (sender?.prenom?.[0] || sender?.nom?.[0] || sender?.username?.[0] || '?').toUpperCase();

  return (
    <div className={`flex items-end gap-2 my-1 animate-fade-in ${isOwnMessage ? 'justify-start' : 'justify-end'}`}>
      {/* Avatar (pour les messages reçus seulement, aligné en bas comme Messenger) */}
      {!isOwnMessage && (
        <Avatar className="w-8 h-8 shrink-0 ring-1 ring-slate-200">
          <AvatarImage src={senderPhoto} alt={sender?.nom || t('messages.recipientFallback')} />
          <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
            {senderInitial}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bulle style Messenger */}
      <div
        className={`group relative max-w-[70%] px-3.5 py-2 shadow-2xs transition-all duration-200 ${
          isOwnMessage
            ? 'bg-[#2c5282] text-white rounded-2xl rounded-tr-sm'
            : 'bg-slate-100 text-[#1a202c] rounded-2xl rounded-tl-sm'
        }`}
      >
        {/* Delete button (hover/focus, 44x44 touch target with visual badge) */}
        {isOwnMessage && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={t('messages.delete')}
            className="absolute -top-4 -end-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-opacity z-10"
            title={t('messages.delete')}
          >
            <span className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md">
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </span>
          </button>
        )}

        {/* Contenu texte */}
        {message.content && (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">
            {message.content}
          </p>
        )}

        {/* Pièces jointes (AttachmentsList) */}
        {message.attachments?.length > 0 && (
          <div className="mt-1.5">
            <AttachmentsList attachments={message.attachments} />
          </div>
        )}

        {/* Footer : heure + read receipt (✓ / ✓✓) */}
        <div
          className={`flex items-center justify-end gap-1 mt-0.5 select-none ${
            isOwnMessage ? 'text-white/70' : 'text-slate-400'
          }`}
        >
          <span className="text-[10px]">{formatTime(message.createdAt)}</span>
          {isOwnMessage && (
            <span className="text-[10px] tracking-tighter" title={isRead ? t('messages.readStatus') : t('messages.sentStatus')}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

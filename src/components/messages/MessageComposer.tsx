import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { X, Send, Paperclip, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import ContactSelector from './ContactSelector';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface MessageComposerProps {
  onClose: () => void;
  onMessageSent: () => void;
  initialRecipients?: User[];
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  onClose,
  onMessageSent,
  initialRecipients = []
}) => {
  const [recipients, setRecipients] = useState<User[]>(initialRecipients);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: ({ recipientIds, subject, content, attachments, priority }: {
      recipientIds: string[];
      subject: string;
      content: string;
      attachments?: File[];
      priority: 'normal' | 'high' | 'urgent';
    }) => sendMessage(recipientIds, subject, content, attachments, priority),
    onSuccess: () => {
      toast.success(t('messages.sent'), {
        description: t('messages.sentSuccess')
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onMessageSent();
      onClose();
    },
    onError: (error: unknown) => {
      const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(isRTL ? 'خطأ' : 'Erreur', {
        description: errorMsg || t('messages.sendError'),
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length === 0) {
      toast.error(isRTL ? 'تنبيه' : 'Alerte', {
        description: t('messages.selectRecipient'),
      });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast.error(isRTL ? 'تنبيه' : 'Alerte', {
        description: t('messages.fillFields'),
      });
      return;
    }

    const recipientIds = recipients.map(r => r._id);
    sendMessageMutation.mutate({
      recipientIds,
      subject: subject.trim(),
      content: content.trim(),
      attachments,
      priority
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir={dir}>
      <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg rounded-xl overflow-hidden">
        <div className="border-b border-slate-200/80 dark:border-slate-800 px-5 py-3 flex items-center justify-between bg-white dark:bg-slate-900">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('messages.compose')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="h-9 w-9 p-0 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                {t('messages.recipients')} *
              </Label>
              <ContactSelector
                selectedContacts={recipients}
                onContactsChange={setRecipients}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="quick-subject" className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                  {t('messages.subject')} *
                </Label>
                <Input
                  id="quick-subject"
                  placeholder={t('messages.enterSubject')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="h-9 text-xs text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-[#2c5282] dark:focus:border-sky-500 rounded-lg"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                  {isRTL ? 'الأولوية' : 'Priorité'}
                </Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'normal' | 'high' | 'urgent')}
                  className="w-full h-9 text-xs text-start border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:border-[#2c5282] dark:focus:border-sky-500"
                >
                  <option value="normal">{isRTL ? 'عادية' : 'Normale'}</option>
                  <option value="high">{isRTL ? 'مرتفعة' : 'Haute'}</option>
                  <option value="urgent">{isRTL ? 'عاجلة جداً' : 'Très urgente'}</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="quick-content" className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                {t('messages.content')} *
              </Label>
              <Textarea
                id="quick-content"
                placeholder={t('messages.typeMessage')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="text-xs text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-[#2c5282] dark:focus:border-sky-500 rounded-lg"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="quick-file-upload"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('quick-file-upload')?.click()}
                  className="h-9 text-xs border-dashed border-slate-300 dark:border-slate-700 bg-transparent hover:border-[#2c5282] dark:hover:border-sky-500 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {isRTL ? `إرفاق ملفات (${attachments.length})` : `Joindre des fichiers (${attachments.length})`}
                  </span>
                </Button>
              </div>

              {/* Ready attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 ps-2.5 pe-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 shadow-2xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400 shrink-0" />
                      <span className="truncate max-w-[140px] font-medium" dir="ltr">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                        ({(file.size / 1024).toFixed(0)} {t('common.kb')})
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        aria-label={t('common.preview')}
                        className="h-8 w-8 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#2c5282] dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title={t('common.preview')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        aria-label={t('common.remove')}
                        className="h-8 w-8 inline-flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                        title={t('common.remove')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview modal */}
            <AttachmentPreviewModal
              isOpen={!!previewFile}
              onClose={() => setPreviewFile(null)}
              filename={previewFile?.name}
              localBlob={previewFile}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-3.5 text-xs rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('messages.cancel')}
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={sendMessageMutation.isPending}
                className="h-9 px-4 text-xs font-medium rounded-lg bg-[#2c5282] hover:bg-[#234269] dark:bg-sky-700 dark:hover:bg-sky-600 text-white transition-colors duration-200 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sendMessageMutation.isPending ? t('messages.sending') : t('messages.send')}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageComposer;

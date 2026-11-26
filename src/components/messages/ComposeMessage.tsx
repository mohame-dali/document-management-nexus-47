import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import {
  X,
  Upload,
  Send,
  Paperclip,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import ContactSelector from './ContactSelector';

interface ComposeMessageProps {
  onClose: () => void;
  onMessageSent: () => void;
  initialRecipients?: User[];
}

const ComposeMessage: React.FC<ComposeMessageProps> = ({
  onClose,
  onMessageSent,
  initialRecipients = []
}) => {
  const [recipients, setRecipients] = useState<User[]>(initialRecipients);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [attachments, setAttachments] = useState<File[]>([]);

  const { t } = useLanguage();
  const { dir, isRTL } = useDirection();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: ({
      recipientIds,
      subject,
      content,
      attachments,
      priority
    }: {
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
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(isRTL ? 'خطأ في الإرسال' : "Erreur d'envoi", {
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

    const recipientIds = recipients.map(recipient => recipient._id);
    sendMessageMutation.mutate({
      recipientIds,
      subject: subject.trim(),
      content: content.trim(),
      attachments,
      priority
    });
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 py-3 px-1 sm:px-4" dir={dir}>
      <Card className="w-full max-w-4xl mx-auto shadow-sm border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[#2c5282] dark:text-sky-400 shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('messages.compose')}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {isRTL
                  ? 'إرسال رسالة رسمية جديدة إلى مستخدم أو مجموعة مستخدمين'
                  : 'Envoyer un nouveau message officiel à un utilisateur ou un groupe'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="h-10 w-10 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200 flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Recipients Section */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>{t('messages.recipients')}</span>
                <span className="text-red-500">*</span>
              </Label>
              <ContactSelector
                selectedContacts={recipients}
                onContactsChange={setRecipients}
              />
            </div>

            {/* Subject — Full Width */}
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>{t('messages.subject')}</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder={t('messages.enterSubject') || (isRTL ? 'أدخل موضوع الرسالة...' : 'Objet du message...')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-10 w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg px-3.5 text-sm focus:border-[#2c5282] dark:focus:border-sky-500 focus:ring-1 focus:ring-[#2c5282] dark:focus:ring-sky-500 text-start"
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isRTL ? 'درجة الأولوية' : 'Priorité'}
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex-1 h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    priority === 'normal'
                      ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isRTL ? 'عادية' : 'Normale'}
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex-1 h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    priority === 'high'
                      ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isRTL ? 'مرتفعة' : 'Haute'}
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    priority === 'urgent'
                      ? 'bg-[#2c5282] dark:bg-sky-700 text-white shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isRTL ? 'عاجلة' : 'Urgente'}
                </button>
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>{t('messages.content')}</span>
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder={t('messages.typeMessage')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                required
                className="min-h-[160px] w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg p-3.5 text-sm focus:border-[#2c5282] dark:focus:border-sky-500 focus:ring-1 focus:ring-[#2c5282] dark:focus:ring-sky-500 text-start resize-y"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{t('messages.attachments')}</span>
                </Label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {isRTL ? '(PDF, صور، مستندات)' : '(PDF, images, documents)'}
                </span>
              </div>

              <div>
                <input
                  type="file"
                  id="file-upload-input"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  className="h-10 text-xs border border-dashed border-slate-300 dark:border-slate-700 bg-transparent hover:border-[#2c5282] dark:hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 w-full transition-colors duration-200 rounded-lg text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{t('messages.addAttachments')}</span>
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ps-3 pe-1 py-1 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                          ({(file.size / 1024).toFixed(0)} {t('common.kb')})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        aria-label={t('common.remove')}
                        title={t('common.remove')}
                        className="h-9 w-9 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-md shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-10 px-4 text-xs font-medium rounded-lg border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              >
                {t('messages.cancel')}
              </Button>

              <Button
                type="submit"
                disabled={sendMessageMutation.isPending}
                className="h-10 px-5 text-xs font-medium rounded-lg bg-[#2c5282] hover:bg-[#234269] dark:bg-sky-700 dark:hover:bg-sky-600 text-white transition-colors duration-200 flex items-center gap-2"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>{t('messages.sending')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>{t('messages.send')}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComposeMessage;

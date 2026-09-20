import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Send, Paperclip, AlertCircle, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import ContactSelector from './ContactSelector';

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

  const { t } = useLanguage();
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
      toast({
        title: t('messages.sent'),
        description: t('messages.sentSuccess')
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onMessageSent();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.response?.data?.message || t('messages.sendError'),
        variant: "destructive"
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
      toast({
        title: "تنبيه",
        description: t('messages.selectRecipient'),
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast({
        title: "تنبيه",
        description: t('messages.fillFields'),
        variant: "destructive"
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-2xl bg-white border border-[#e2e8f0] shadow-lg rounded overflow-hidden">
        <div className="border-b border-[#e2e8f0] px-5 py-3 flex items-center justify-between bg-white">
          <CardTitle className="text-base font-bold text-slate-900">
            {t('messages.compose')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            aria-label="إغلاق النافذة"
            title="إغلاق النافذة"
            className="h-11 w-11 p-0 text-slate-400 hover:text-slate-700 rounded flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 block mb-1">
                {t('messages.recipients')} *
              </Label>
              <ContactSelector 
                selectedContacts={recipients}
                onContactsChange={setRecipients}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="quick-subject" className="text-xs font-semibold text-slate-700 block mb-1">
                  {t('messages.subject')} *
                </Label>
                <Input
                  id="quick-subject"
                  placeholder={t('messages.enterSubject')}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="h-8 text-xs text-right border-[#cbd5e1] focus:border-[#2c5282] rounded"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">
                  الأولوية
                </Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-8 text-xs text-right border border-[#cbd5e1] rounded px-2 bg-white text-slate-700 focus:border-[#2c5282]"
                >
                  <option value="normal">عادية</option>
                  <option value="high">مرتفعة</option>
                  <option value="urgent">عاجلة جداً</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="quick-content" className="text-xs font-semibold text-slate-700 block mb-1">
                {t('messages.content')} *
              </Label>
              <Textarea
                id="quick-content"
                placeholder={t('messages.typeMessage')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
                className="text-xs text-right border-[#cbd5e1] focus:border-[#2c5282] rounded"
              />
            </div>

            {/* Attachments */}
            <div>
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
                className="h-11 text-xs border-dashed border-[#cbd5e1] hover:border-[#2c5282] text-slate-600 rounded flex items-center gap-1.5"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>إرفاق ملفات ({attachments.length})</span>
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={onClose}
                className="h-11 px-3.5 text-xs rounded border-[#cbd5e1] text-slate-700"
              >
                {t('messages.cancel')}
              </Button>

              <Button 
                type="submit" 
                size="sm"
                disabled={sendMessageMutation.isPending}
                className="h-11 px-4 text-xs font-medium rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 flex items-center gap-1.5"
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

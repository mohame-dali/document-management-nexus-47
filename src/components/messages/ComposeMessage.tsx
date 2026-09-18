import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  X, 
  Upload, 
  Send,
  Paperclip,
  MessageSquare,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
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
      toast({
        title: t('messages.sent'),
        description: t('messages.sentSuccess')
      });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onMessageSent();
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "خطأ في الإرسال",
        description: err.response?.data?.message || t('messages.sendError'),
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
    <div className="bg-[#f7fafc] py-4 px-2 sm:px-6" dir="rtl">
      <Card className="w-full max-w-4xl mx-auto shadow-sm border border-[#e2e8f0] rounded bg-white overflow-hidden">
        {/* Sober AdminLTE Header */}
        <div className="border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded text-[#2c5282]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                {t('messages.compose')}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                إرسال رسالة رسمية جديدة إلى مستخدم أو مجموعة مستخدمين
              </p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipients Section */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#4a5568] flex items-center gap-1.5">
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
              <Label htmlFor="subject" className="text-sm font-semibold text-[#4a5568] flex items-center gap-1.5">
                <span>{t('messages.subject')}</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder={t('messages.enterSubject') || "أدخل موضوع الرسالة..."}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-11 w-full bg-white border-[#cbd5e1] rounded-lg px-4 text-base focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right"
              />
            </div>

            {/* Priority Selector on dedicated row with segmented controls */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#4a5568]">
                درجة الأولوية
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium transition-colors ${
                    priority === 'normal'
                      ? 'bg-[#2c5282] text-white'
                      : 'bg-[#f7fafc] text-[#1a202c] border border-[#cbd5e1] hover:bg-[#edf2f7]'
                  }`}
                >
                  عادية
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium transition-colors ${
                    priority === 'high'
                      ? 'bg-[#2c5282] text-white'
                      : 'bg-[#f7fafc] text-[#1a202c] border border-[#cbd5e1] hover:bg-[#edf2f7]'
                  }`}
                >
                  مرتفعة
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('urgent')}
                  className={`flex-1 h-11 rounded-lg text-sm font-medium transition-colors ${
                    priority === 'urgent'
                      ? 'bg-[#2c5282] text-white'
                      : 'bg-[#f7fafc] text-[#1a202c] border border-[#cbd5e1] hover:bg-[#edf2f7]'
                  }`}
                >
                  عاجلة
                </button>
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-sm font-semibold text-[#4a5568] flex items-center gap-1.5">
                <span>{t('messages.content')}</span>
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder={t('messages.typeMessage')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                required
                className="min-h-[180px] w-full bg-white border-[#cbd5e1] rounded-lg p-4 text-base focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] text-right resize-y"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 pt-1 border-t border-[#edf2f7]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('messages.attachments')}</span>
                </Label>
                <span className="text-[11px] text-slate-400">
                  (PDF, صور، مستندات)
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
                  className="h-9 text-xs border border-dashed border-[#cbd5e1] hover:border-[#2c5282] hover:bg-slate-50 w-full transition-colors duration-200 rounded text-slate-600 flex items-center justify-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('messages.addAttachments')}</span>
                </Button>
              </div>

              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {attachments.map((file, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 rounded text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          ({(file.size / 1024).toFixed(0)} ك.ب)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-9 px-4 text-xs font-medium rounded border-[#cbd5e1] text-slate-700 hover:bg-slate-100 transition-colors duration-200"
              >
                {t('messages.cancel')}
              </Button>

              <Button 
                type="submit" 
                disabled={sendMessageMutation.isPending}
                className="h-9 px-5 text-xs font-medium rounded bg-[#2c5282] hover:bg-[#234269] text-white transition-colors duration-200 flex items-center gap-2"
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

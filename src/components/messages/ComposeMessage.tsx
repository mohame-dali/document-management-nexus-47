
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
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import ContactSelector from './ContactSelector';

interface ComposeMessageProps {
  onClose: () => void;
  onMessageSent: () => void;
}

const ComposeMessage: React.FC<ComposeMessageProps> = ({ onClose, onMessageSent }) => {
  const [recipients, setRecipients] = useState<User[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: ({ recipientIds, subject, content, attachments }: {
      recipientIds: string[];
      subject: string;
      content: string;
      attachments?: File[];
    }) => sendMessage(recipientIds, subject, content, attachments),
    onSuccess: () => {
      toast({
        title: t('messages.sent'),
        description: t('messages.sentSuccess')
      });
      onMessageSent();
      onClose();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: t('messages.sendError'),
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recipients.length === 0) {
      toast({
        title: "خطأ",
        description: t('messages.selectRecipient'),
        variant: "destructive"
      });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast({
        title: "خطأ",
        description: t('messages.fillFields'),
        variant: "destructive"
      });
      return;
    }

    const recipientIds = recipients.map(recipient => recipient._id);
    sendMessageMutation.mutate({ recipientIds, subject, content, attachments });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 flex items-center justify-center" dir="rtl">
      <Card className="w-full max-w-4xl mx-auto shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-sm">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-1">
          <CardHeader className="bg-white m-1 rounded-lg shadow-inner">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-lg">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {t('messages.compose')}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1 font-medium">إنشاء رسالة جديدة</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="hover:bg-red-50 hover:text-red-600 p-2 rounded-full transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Recipients Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                {t('messages.recipients')}
              </Label>
              <ContactSelector 
                selectedContacts={recipients}
                onContactsChange={setRecipients}
              />
            </div>

            {/* Subject */}
            <div className="space-y-3">
              <Label htmlFor="subject" className="text-base font-semibold text-gray-800">
                {t('messages.subject')}
              </Label>
              <Input
                id="subject"
                placeholder={t('messages.enterSubject')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-12 text-right border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
              />
            </div>

            {/* Content */}
            <div className="space-y-3">
              <Label htmlFor="content" className="text-base font-semibold text-gray-800">
                {t('messages.content')}
              </Label>
              <Textarea
                id="content"
                placeholder={t('messages.typeMessage')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                required
                className="text-right border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none transition-colors duration-200"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-4">
              <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-gray-600" />
                {t('messages.attachments')}
              </Label>
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="h-12 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 w-full transition-colors duration-200"
                  >
                    <Upload className="h-5 w-5 ml-2 text-gray-500" />
                    {t('messages.addAttachments')}
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-3 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="hover:bg-red-100 hover:text-red-600 p-1 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-12 px-8 border-2 border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                {t('messages.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={sendMessageMutation.isPending}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {sendMessageMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('messages.sending')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {t('messages.send')}
                  </div>
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

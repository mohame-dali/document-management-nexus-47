
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Send, Plus, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendMessage } from '@/services/messageService';
import { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const removeRecipient = (userId: string) => {
    setRecipients(recipients.filter(recipient => recipient._id !== userId));
  };

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800';
      case 'AdminDepartment':
        return 'bg-blue-100 text-blue-800';
      case 'AdminTuningDesk':
        return 'bg-green-100 text-green-800';
      case 'User':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    return t(`roles.${role}`) || role;
  };

  if (!isExpanded) {
    return (
      <Card className="fixed bottom-4 left-4 w-80 shadow-lg" dir="rtl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{t('messages.quickMessage')}</CardTitle>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsExpanded(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500">
            {t('messages.clickCompose')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 w-96 max-h-[80vh] shadow-lg" dir="rtl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('messages.compose')}</CardTitle>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              —
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipients */}
          <div>
            <Label htmlFor="recipients">{t('messages.recipients')}</Label>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {recipients.map(recipient => (
                  <Badge key={recipient._id} variant="secondary" className="flex items-center gap-1">
                    <span className="text-xs">{recipient.username}</span>
                    <Badge className={`text-xs ${getRoleColor(recipient.role)}`}>
                      {getRoleDisplayName(recipient.role)}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeRecipient(recipient._id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">{t('messages.subject')}</Label>
            <Input
              id="subject"
              placeholder={t('messages.enterSubject')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="text-right"
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">{t('messages.content')}</Label>
            <Textarea
              id="content"
              placeholder={t('messages.typeMessage')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
              className="text-right"
            />
          </div>

          {/* Attachments */}
          <div>
            <Label>{t('messages.attachments')}</Label>
            <div className="space-y-2">
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
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  {t('messages.addFiles')}
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
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
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t('messages.cancel')}
            </Button>
            <Button 
              type="submit" 
              size="sm"
              disabled={sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? (
                t('messages.sending')
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  {t('messages.send')}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MessageComposer;

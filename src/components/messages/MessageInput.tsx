import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MessageInputProps {
  onSend: (content: string, files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'اكتب رسالة...',
}) => {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea up to max 5 lines (approx 120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 42), 120)}px`;
    }
  }, [content]);

  const handleSend = () => {
    const trimmed = content.trim();
    if ((!trimmed && selectedFiles.length === 0) || disabled) return;

    onSend(trimmed, selectedFiles);
    setContent('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-[#e2e8f0] bg-white p-3 sm:p-4">
      {/* File Previews if attached */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-slate-100">
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700"
            >
              <FileIcon className="h-3.5 w-3.5 text-[#2c5282] shrink-0" />
              <span className="truncate max-w-[140px] font-medium" dir="ltr">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(idx)}
                className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                title="إزالة الملف"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="إرفاق ملف"
          className="h-11 w-11 shrink-0 text-slate-500 hover:text-[#2c5282] hover:bg-[#f7fafc] rounded transition-colors"
          title="إرفاق ملف"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none overflow-y-auto px-4 py-2.5 text-[15px] bg-white text-slate-900 border border-[#cbd5e1] focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] rounded outline-none transition-all placeholder:text-slate-400 min-h-[42px] max-h-[120px]"
          dir="rtl"
        />

        {/* Send Button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!content.trim() && selectedFiles.length === 0)}
          aria-label="إرسال الرسالة"
          className="h-11 w-11 shrink-0 rounded bg-[#2c5282] hover:bg-[#234269] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shadow-xs"
          title="إرسال (Enter)"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;

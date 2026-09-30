import React, { useState, useRef } from 'react';
import { Plus, Smile, Send, ThumbsUp, X, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface MessageInputProps {
  onSend: (content: string, files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];

const MAX_SIZE_MB = 10;
const MAX_FILES = 3;

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Aa',
}) => {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = content.trim();
    if ((!trimmed && selectedFiles.length === 0) || disabled) return;

    onSend(trimmed, selectedFiles);
    setContent('');
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleThumbsUp = () => {
    if (disabled) return;
    onSend('👍', []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`الحد الأقصى هو ${MAX_FILES} ملفات لكل رسالة`);
      return;
    }

    const validFiles: File[] = [];

    for (const file of files) {
      // 10 MB limit
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`الملف "${file.name}" يتجاوز الحجم المسموح به (${MAX_SIZE_MB} ميغابايت)`);
        continue;
      }

      // Format validation
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext);
      const isValidMime = ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/');

      if (!isValidExt && !isValidMime) {
        toast.error(`صيغة الملف "${file.name}" غير مدعومة`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, MAX_FILES));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContentToSend = content.trim().length > 0 || selectedFiles.length > 0;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3" dir="rtl">
      {/* File input caché */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
      />

      {/* Preview des fichiers sélectionnés */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            return (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700 shadow-2xs"
              >
                {isImg ? (
                  <ImageIcon className="h-3.5 w-3.5 text-[#2c5282] shrink-0" />
                ) : (
                  <FileIcon className="h-3.5 w-3.5 text-[#2c5282] shrink-0" />
                )}
                <span className="truncate max-w-[130px] font-medium" dir="ltr">
                  {file.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({(file.size / 1024).toFixed(0)} ك.ب)
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded-full"
                  title="إزالة"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre principale Messenger */}
      <div className="flex items-center gap-2">
        {/* Bouton + (Pièce jointe) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || selectedFiles.length >= MAX_FILES}
          className="p-2 text-[#2c5282] hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={`إرفاق ملف (${selectedFiles.length}/${MAX_FILES})`}
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Input capsule Messenger */}
        <div className="flex-1 flex items-center bg-slate-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-[#2c5282]/30 focus-within:bg-white border border-transparent focus-within:border-[#2c5282]/40 transition-all">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#1a202c] placeholder:text-slate-400"
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => setContent((prev) => prev + ' 😊')}
            className="mr-2 text-[#2c5282] hover:opacity-80 transition-opacity p-0.5"
            title="إضافة رمز تعبيري"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Bouton Envoyer OU ThumbsUp */}
        {hasContentToSend ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="p-2 text-[#2c5282] hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="إرسال"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleThumbsUp}
            disabled={disabled}
            className="p-2 text-[#2c5282] hover:bg-slate-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="إعجاب (👍)"
          >
            <ThumbsUp className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mention quota */}
      <p className="text-[10px] text-slate-400 text-center mt-1 select-none">
        الحد الأقصى: 3 ملفات، 10 ميغا لكل ملف
      </p>
    </div>
  );
};

export default MessageInput;

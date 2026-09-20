
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X } from 'lucide-react';

interface DocumentUploadProps {
  onFileSelect: (files: File[]) => void;
  existingFiles?: string[];
  onRemoveExisting?: (fileUrl: string) => void;
  multiple?: boolean;
  accept?: string;
  fieldName?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFileSelect,
  existingFiles = [],
  onRemoveExisting,
  multiple = true,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  fieldName = 'document'
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length) {
      const newFiles = multiple ? [...files, ...droppedFiles] : [droppedFiles[0]];
      setFiles(newFiles);
      onFileSelect(newFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = multiple ? [...files, ...selectedFiles] : [selectedFiles[0]];
      setFiles(newFiles);
      onFileSelect(newFiles);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const newFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(newFiles);
    onFileSelect(newFiles);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-green-500" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">اسحب وأفلت الملفات هنا</p>
        <p className="text-gray-500 mb-4">أو</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          استعرض الملفات
        </Button>
        <input
          id="fileInput"
          type="file"
          multiple={multiple}
          accept={accept}
          name={fieldName}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">
            تم اختيار {files.length} ملفات
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
              >
                <div className="flex items-center">
                  {getFileIcon(file.name)}
                  <span className="mr-2 text-sm truncate max-w-xs">{file.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeFile(index)}
                  aria-label="إزالة الملف"
                  title="إزالة الملف"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingFiles && existingFiles.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">الملفات الموجودة</p>
          <div className="space-y-2">
            {existingFiles.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop() || 'ملف';
              return (
                <div 
                  key={`existing-${index}`}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                >
                  <div className="flex items-center">
                    {getFileIcon(fileName)}
                    <span className="mr-2 text-sm truncate max-w-xs">{fileName}</span>
                  </div>
                  {onRemoveExisting && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onRemoveExisting(fileUrl)}
                      aria-label="إزالة الملف"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;

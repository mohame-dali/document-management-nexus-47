import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename?: string;
  fileUrl?: string; // URL vers l'API ou chemin relatif Multer
  localBlob?: Blob | File | null; // Pour preview avant envoi (Fichier local direct)
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  isOpen,
  onClose,
  filename = '',
  fileUrl,
  localBlob = null,
}) => {
  const { t } = useLanguage();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const isPdf = extension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setIsLoading(false);
      setError(null);
      return;
    }

    // 1. Si un Blob / File local est directement passé (ex: avant envoi)
    if (localBlob) {
      createdUrl = URL.createObjectURL(localBlob);
      setBlobUrl(createdUrl);
      setIsLoading(false);
      setError(null);
      return () => {
        if (createdUrl) URL.revokeObjectURL(createdUrl);
      };
    }

    // 2. Si on a une fileUrl distante
    if (!fileUrl) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchFile = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiBaseUrl = import.meta.env.VITE_API_URL || '';

        // Construire l'URL complète si relative
        let targetUrl = fileUrl;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          if (targetUrl.startsWith('/api/')) {
            targetUrl = `${apiBaseUrl}${targetUrl}`;
          } else if (targetUrl.startsWith('api/')) {
            targetUrl = `${apiBaseUrl}/${targetUrl}`;
          } else {
            // C'est un nom de fichier brut ou un chemin relatif Multer
            const diskName = targetUrl.split(/[/\\]/).pop() || targetUrl;
            targetUrl = `${apiBaseUrl}/api/messages/attachments/${diskName}`;
          }
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} : ${response.statusText}`);
        }

        const blob = await response.blob();
        if (!active) return;

        // Forcer le type correct si le header serveur est générique
        let finalBlob = blob;
        if (isPdf && blob.type !== 'application/pdf') {
          finalBlob = new Blob([blob], { type: 'application/pdf' });
        } else if (isImage && !blob.type.startsWith('image/')) {
          finalBlob = new Blob([blob], { type: `image/${extension === 'jpg' ? 'jpeg' : extension}` });
        }

        createdUrl = URL.createObjectURL(finalBlob);
        setBlobUrl(createdUrl);
      } catch (err: unknown) {
        if (!active) return;
        console.error('Erreur chargement aperçu pièce jointe:', err);
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchFile();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, fileUrl, localBlob, isPdf, isImage, extension]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenExternal = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 gap-3">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b pb-3 text-start">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 bg-[#2c5282]/10 text-[#2c5282] rounded shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold truncate text-slate-800" title={filename}>
                {filename || t('common.preview')}
              </DialogTitle>
              <p className="text-xs text-slate-400">
                {isPdf ? 'Document PDF' : isImage ? 'Image' : 'Fichier'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pe-8">
            {blobUrl && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="h-8 px-2.5 text-xs gap-1.5"
                  title={t('common.view')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('common.view')}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 px-3 text-xs gap-1.5 bg-[#2c5282] hover:bg-[#234269] text-white"
                  title={t('common.download')}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('common.download')}</span>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Corps de la modale */}
        <div className="flex-1 w-full min-h-[50vh] max-h-[72vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200 p-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#2c5282]" />
              <p className="text-sm font-medium">Chargement de l'aperçu...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <p className="text-sm font-medium text-slate-700">Impossible de charger l'aperçu</p>
              <p className="text-xs text-slate-400 max-w-sm">{error}</p>
            </div>
          )}

          {!isLoading && !error && blobUrl && (
            <>
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={filename}
                  className="w-full h-full min-h-[65vh] border-0 rounded bg-white"
                />
              )}

              {isImage && (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <img
                    src={blobUrl}
                    alt={filename}
                    className="max-w-full max-h-[68vh] object-contain rounded shadow-sm"
                  />
                </div>
              )}

              {!isPdf && !isImage && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
                  <FileText className="h-12 w-12 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    Aperçu non disponible pour ce type de fichier
                  </p>
                  <p className="text-xs text-slate-400">
                    Vous pouvez télécharger le fichier pour l'ouvrir avec l'application appropriée.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDownload}
                    className="mt-2 h-9 px-4 text-xs gap-2 bg-[#2c5282] hover:bg-[#234269] text-white"
                  >
                    <Download className="h-4 w-4" />
                    <span>{t('common.download')} ({filename})</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentPreviewModal;


import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDocumentUrl } from '@/services/documentService';

interface PDFViewerProps {
  documentPath: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ documentPath }) => {
  const [loadError, setLoadError] = useState(false);
  
  // Use the fixed document URL helper
  const documentUrl = getDocumentUrl(documentPath);

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentPath.split('/').pop() || 'document.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeError = () => {
    setLoadError(true);
  };

  if (!documentPath) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-2" />
            <p>No document available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Preview
          </h3>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleOpenInNewTab}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
        
        {loadError ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to display PDF preview. The document path may be incorrect or the file may not exist on the server.
            </AlertDescription>
          </Alert>
        ) : null}
        
        <div className="border rounded overflow-hidden bg-gray-50" style={{ height: '600px' }}>
          {!loadError ? (
            <iframe
              src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Document Preview"
              onError={handleIframeError}
              onLoad={() => setLoadError(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium mb-2">PDF Preview Unavailable</p>
              <p className="text-sm text-center mb-4 max-w-md">
                The PDF cannot be displayed. This might be due to an incorrect file path, missing file, or browser restrictions.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleOpenInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;

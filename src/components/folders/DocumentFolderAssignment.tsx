import React from 'react';
import CompactFolderPicker from './CompactFolderPicker';

interface DocumentFolderAssignmentProps {
  documentId: string;
  documentType: 'incoming' | 'outgoing';
  currentFolderId?: string | null;
  onAssignmentUpdate: () => void;
  readOnly?: boolean;
}

const DocumentFolderAssignment: React.FC<DocumentFolderAssignmentProps> = ({
  documentId,
  documentType,
  currentFolderId,
  onAssignmentUpdate,
  readOnly = false,
}) => {
  return (
    <CompactFolderPicker
      open={true}
      documentIds={[documentId]}
      documentType={documentType}
      currentFolderId={currentFolderId}
      readOnly={readOnly}
      onSuccess={onAssignmentUpdate}
      onCancel={onAssignmentUpdate}
    />
  );
};

export default DocumentFolderAssignment;


import React, { useState } from 'react';
import { MoreHorizontal, Eye, Download, Edit, FolderOpen, UserPlus, MessageSquare, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { downloadDocument, deleteIncomingDocument, deleteOutgoingDocument } from '@/services/documentService';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import DocumentFolderDialog from './DocumentFolderDialog';
import AssignResponseDialog from './AssignResponseDialog';
import AssignResponsibleDialog from './AssignResponsibleDialog';

interface DocumentActionsProps {
  doc: IncomingDocument | OutgoingDocument;
  type: 'incoming' | 'outgoing';
  translations: {
    documentDetails: string;
    viewFullDetails: string;
    downloadPDF: string;
  };
}

const DocumentActions: React.FC<DocumentActionsProps> = ({ doc, type, translations }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showResponsibleDialog, setShowResponsibleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdminDepartment = currentUser?.role === 'AdminDepartment';
  const isAdminTuningDesk = currentUser?.role === 'AdminTuningDesk';
  const isAdmin = currentUser?.role === 'Admin';
  const isSuperAdmin = currentUser?.role === 'SuperAdmin';
  
  // SuperAdmin, AdminTuningDesk and Admin can edit and delete documents
  const canEdit = isSuperAdmin || isAdminTuningDesk || isAdmin;
  const canDelete = isSuperAdmin || isAdminTuningDesk || isAdmin;

  // AdminDepartment can organize documents, others can only view
  const canOrganizeDocuments = isAdminDepartment;
  const canViewCategorization = isAdmin || 
                               isAdminTuningDesk || 
                               isAdminDepartment ||
                               currentUser?.role === 'User';

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (type === 'incoming') {
        return await deleteIncomingDocument(doc._id);
      } else {
        return await deleteOutgoingDocument(doc._id);
      }
    },
    onSuccess: () => {
      toast.success('تم حذف المستند بنجاح');
      queryClient.invalidateQueries({ queryKey: [`${type}Documents`] });
      navigate(`/dashboard/${type}-documents`);
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('فشل في حذف المستند');
    }
  });

  const handleViewDetails = () => {
    navigate(`/dashboard/${type}-documents/${doc._id}`);
  };

  const handleEdit = () => {
    navigate(`/dashboard/${type}-documents/${doc._id}/edit`);
  };

  const handleDownload = async () => {
    if (doc.scannedDocument) {
      try {
        await downloadDocument(doc.scannedDocument, `${type}-document-${doc.serialNumber}-${doc.year}.pdf`);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const getFolderActionText = () => {
    if (canOrganizeDocuments) {
      return 'تنظيم في مجلد';
    }
    return 'عرض التصنيف';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="ml-2 h-4 w-4" />
            {translations.viewFullDetails}
          </DropdownMenuItem>
          
          {doc.scannedDocument && (
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="ml-2 h-4 w-4" />
              {translations.downloadPDF}
            </DropdownMenuItem>
          )}
          
          {canEdit && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="ml-2 h-4 w-4" />
              تعديل
            </DropdownMenuItem>
          )}

          {canDelete && (
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="ml-2 h-4 w-4" />
              حذف
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          
          {/* Folder categorization - available to view for all, organize only for AdminDepartment */}
          {canViewCategorization && (
            <DropdownMenuItem onClick={() => setShowFolderDialog(true)}>
              <FolderOpen className="ml-2 h-4 w-4" />
              {getFolderActionText()}
            </DropdownMenuItem>
          )}

          {/* AdminDepartment specific actions for incoming documents */}
          {isAdminDepartment && type === 'incoming' && (
            <>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => setShowResponseDialog(true)}>
                <MessageSquare className="ml-2 h-4 w-4" />
                إضافة رد
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setShowResponsibleDialog(true)}>
                <UserPlus className="ml-2 h-4 w-4" />
                تعيين مسؤول
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-bold text-red-600 text-right">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600 mt-2 text-right">
              هل أنت متأكد من أنك تريد حذف هذا المستند؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row-reverse justify-start gap-3 mt-4 pt-4 border-t border-[#e2e8f0]">
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base h-11 px-7 rounded shadow-none"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
            <AlertDialogCancel className="h-11 px-6 rounded border-[#cbd5e1] text-gray-700 hover:bg-gray-100 text-base font-medium">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Assignment Dialog */}
      {canViewCategorization && (
        <DocumentFolderDialog
          open={showFolderDialog}
          onOpenChange={setShowFolderDialog}
          document={doc}
          documentType={type}
          readOnly={!canOrganizeDocuments}
        />
      )}

      {/* Response Assignment Dialog - Only for incoming documents and AdminDepartment */}
      {type === 'incoming' && isAdminDepartment && (
        <AssignResponseDialog
          open={showResponseDialog}
          onOpenChange={setShowResponseDialog}
          document={doc as IncomingDocument}
        />
      )}

      {/* Responsible Assignment Dialog - Only for incoming documents and AdminDepartment */}
      {type === 'incoming' && isAdminDepartment && (
        <AssignResponsibleDialog
          open={showResponsibleDialog}
          onOpenChange={setShowResponsibleDialog}
          document={doc as IncomingDocument}
        />
      )}
    </>
  );
};

export default DocumentActions;

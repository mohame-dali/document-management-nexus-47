
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, FileUp, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getDepartments } from '@/services/departmentService';
import { getScannerStatus, scanTemporaryDocument } from '@/services/scannerService';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import OutgoingDocumentForm from '@/components/documents/forms/OutgoingDocumentForm';

const translations = {
  title: "إنشاء وثيقة صادرة جديدة",
  back: "الرجوع",
  serialNumber: "الرقم التسلسلي",
  serialNumberDesc: "الرقم التسلسلي الفريد للوثيقة",
  subject: "الموضوع",
  subjectDesc: "موضوع الوثيقة",
  destination: "الوجهة",
  destinationDesc: "وجهة الوثيقة (الشخص أو المؤسسة)",
  issueDate: "تاريخ الإصدار",
  issueDateDesc: "تاريخ إنشاء الوثيقة",
  department: "القسم",
  departmentDesc: "القسم المسؤول عن الوثيقة",
  priority: "الأولوية",
  priorityDesc: "أولوية معالجة الوثيقة",
  description: "الوصف",
  descriptionDesc: "تفاصيل إضافية عن الوثيقة",
  attachments: "المرفقات",
  attachmentsDesc: "إرفاق الملفات المتعلقة بالوثيقة",
  cancel: "إلغاء",
  submit: "إنشاء الوثيقة",
  selectDate: "اختر التاريخ",
  errorLoading: "حدث خطأ أثناء تحميل البيانات",
  required: "هذا الحقل مطلوب",
  createSuccess: "تم إنشاء الوثيقة بنجاح",
  createError: "حدث خطأ أثناء إنشاء الوثيقة",
  uploadTab: "تحميل ملف",
  scanTab: "مسح ضوئي",
  scanDocument: "مسح المستند ضوئيًا",
  scanning: "جاري المسح الضوئي...",
  scanComplete: "تم المسح الضوئي بنجاح",
  scanFailed: "فشل المسح الضوئي",
  noScanner: "لم يتم العثور على ماسح ضوئي",
  scannerNotConfigured: "الماسح الضوئي غير مهيأ",
  configureScanner: "قم بتهيئة الماسح الضوئي",
  scanResults: "نتائج المسح الضوئي",
  resolution: "الدقة",
  format: "الصيغة",
  pdfFormat: "PDF",
  jpegFormat: "JPEG",
  pngFormat: "PNG",
  selectDepartment: "اختر القسم"
};

const CreateOutgoingDocument = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Check if we have scan data passed from another page
  const scanData = location.state?.scanData;
  
  // Query for departments
  const { data: departments, isLoading: loadingDepartments, isError: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments
  });

  // Query for scanner status
  const { data: scannerStatus, isLoading: loadingScannerStatus } = useQuery({
    queryKey: ['scannerStatus'],
    queryFn: getScannerStatus
  });

  // Start scan mutation
  const scanDocumentMutation = useMutation({
    mutationFn: (options: any) => scanTemporaryDocument(options)
  });

  if (loadingDepartments) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#f7fafc]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-green-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (departmentsError) {
    return (
      <div className="p-6 min-h-screen bg-[#f7fafc]">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{translations.errorLoading}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]" dir="rtl">
      {/* Enhanced Header */}
      <div className="bg-[#2c5282] shadow-sm">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center space-x-reverse space-x-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Send className="h-8 w-8 text-white" />
            </div>
            <div>
              <FormSectionHeader 
                title={translations.title}
                backUrl="/dashboard/outgoing-documents"
                backText={translations.back}
                className="text-white"
              />
              <p className="text-green-100 mt-2">أضف وثيقة صادرة جديدة إلى النظام</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#f8fafc] p-6 border-b border-[#e2e8f0]">
            <div className="flex items-center space-x-reverse space-x-3">
              <FileUp className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-800">تفاصيل الوثيقة الصادرة</h2>
            </div>
          </div>
          
          <div className="p-6">
            <OutgoingDocumentForm 
              t={translations}
              departments={departments || []}
              currentDepartmentId={currentUser?.activeDepartment?._id}
              scanData={scanData}
              scannerStatus={scannerStatus}
              loadingScannerStatus={loadingScannerStatus}
              scanTemporaryDocumentMutation={scanDocumentMutation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOutgoingDocument;

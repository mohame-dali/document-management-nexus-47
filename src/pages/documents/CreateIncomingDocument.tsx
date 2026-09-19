
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, FileDown, Inbox } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getDepartments } from '@/services/departmentService';
import { getScannerStatus, scanTemporaryDocument } from '@/services/scannerService';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import IncomingDocumentForm from '@/components/documents/forms/IncomingDocumentForm';

const translations = {
  title: "إنشاء وثيقة واردة جديدة",
  back: "الرجوع",
  serialNumber: "الرقم التسلسلي",
  serialNumberDesc: "الرقم التسلسلي الفريد للوثيقة",
  subject: "الموضوع",
  subjectDesc: "موضوع الوثيقة",
  source: "المصدر",
  sourceDesc: "مصدر الوثيقة (الشخص أو المؤسسة)",
  arrivalDate: "تاريخ الوصول",
  arrivalDateDesc: "تاريخ استلام الوثيقة",
  correspondenceNumber: "رقم المراسلة",
  correspondenceDate: "تاريخ المراسلة",
  typeDocument: "نوع الوثيقة",
  activity: "النشاط",
  status: "الحالة",
  statusDesc: "حالة معالجة الوثيقة",
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
  pendingStatus: "قيد الانتظار",
  processingStatus: "قيد المعالجة",
  reviewedStatus: "تمت المراجعة",
  completedStatus: "مكتمل",
  lowPriority: "منخفضة",
  normalPriority: "عادية",
  highPriority: "عالية",
  urgentPriority: "عاجلة",
  selectDepartment: "اختر القسم",
  selectStatus: "اختر الحالة",
  selectPriority: "اختر الأولوية",
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
  pngFormat: "PNG"
};

const CreateIncomingDocument = () => {
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
          <Loader2 className="h-10 w-10 animate-spin text-[#2c5282] mx-auto mb-4" />
          <p className="text-[#2c5282] font-medium text-base">جاري تحميل البيانات...</p>
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
      {/* Header card: carte blanche avec bordure #e2e8f0 */}
      <div className="pt-6 px-6 max-w-6xl mx-auto">
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
          <div className="flex items-center space-x-reverse space-x-4">
            <div className="bg-[#2c5282] p-3 rounded text-white flex-shrink-0">
              <Inbox className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <FormSectionHeader 
                title={translations.title}
                backUrl="/dashboard/incoming-documents"
                backText={translations.back}
                className="text-[#1a202c] mb-1"
              />
              <p className="text-base text-[#4a5568]">أضف وثيقة واردة جديدة إلى النظام</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="bg-[#f8fafc] p-5 border-b border-[#e2e8f0]">
            <div className="flex items-center space-x-reverse space-x-3">
              <FileDown className="h-5 w-5 text-[#2c5282]" />
              <h2 className="text-lg font-bold text-[#1a202c]">تفاصيل الوثيقة الواردة</h2>
            </div>
          </div>
          
          <div className="p-6">
            <IncomingDocumentForm 
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

export default CreateIncomingDocument;

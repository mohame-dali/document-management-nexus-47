
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

// Arabic translations only
const translations: Record<string, Record<string, string>> = {
  ar: {
    'login.title': 'تسجيل الدخول',
    'login.welcome': 'مرحباً',
    'login.username': 'اسم المستخدم',
    'login.password': 'كلمة المرور',
    'login.submit': 'تسجيل الدخول',
    'login.error': 'بيانات اعتماد غير صحيحة',
    'login.enterUsername': 'أدخل اسم المستخدم',
    'login.enterPassword': 'أدخل كلمة المرور',
    'login.backToHome': 'العودة للرئيسية',
    'login.credentials': 'حساب المدير الافتراضي',
    'login.serverNote': 'تأكد من تشغيل الخادم على',
    'login.loggingIn': 'جاري تسجيل الدخول...',
    'login.networkError': 'خطأ في الشبكة. تأكد من تشغيل الخادم على المنفذ 5000',
    'login.connectionError': 'غير قادر على الاتصال بالخادم',
    'messages.title': 'الرسائل',
    'messages.compose': 'إنشاء رسالة',
    'messages.inbox': 'صندوق الوارد',
    'messages.contacts': 'جهات الاتصال',
    'messages.search': 'البحث في الرسائل...',
    'messages.noMessages': 'لا توجد رسائل بعد',
    'messages.selectMessage': 'اختر رسالة لعرضها',
    'messages.reply': 'رد',
    'messages.delete': 'حذف',
    'messages.send': 'إرسال',
    'messages.subject': 'الموضوع',
    'messages.content': 'الرسالة',
    'messages.recipients': 'المستقبلون',
    'messages.attachments': 'المرفقات',
    'messages.newMessage': 'رسالة جديدة',
    'messages.refresh': 'تحديث',
    'messages.backToMessages': 'العودة للرسائل',
    'messages.messageNotFound': 'الرسالة غير موجودة',
    'messages.loading': 'جاري التحميل...',
    'messages.error': 'خطأ في تحميل الرسائل',
    'messages.tryAgain': 'حاول مرة أخرى',
    'messages.networkError': 'كان هناك مشكلة في الاتصال بخدمة الرسائل',
    'messages.unread': 'غير مقروءة',
    'messages.total': 'إجمالي الرسائل',
    'messages.oneToOne': 'رسائل فردية',
    'messages.group': 'رسائل جماعية',
    'messages.cancel': 'إلغاء',
    'messages.sending': 'جاري الإرسال...',
    'messages.sent': 'تم إرسال الرسالة',
    'messages.sentSuccess': 'تم إرسال رسالتك بنجاح',
    'messages.sendError': 'فشل في إرسال الرسالة',
    'messages.enterSubject': 'أدخل موضوع الرسالة...',
    'messages.typeMessage': 'اكتب رسالتك هنا...',
    'messages.addFiles': 'إضافة ملفات',
    'messages.addAttachments': 'إضافة مرفقات',
    'messages.selectRecipient': 'يرجى اختيار مستقبل واحد على الأقل',
    'messages.fillFields': 'يرجى ملء الموضوع والمحتوى',
    'messages.quickMessage': 'رسالة سريعة',
    'messages.clickCompose': 'اضغط + لإنشاء رسالة جديدة',
    'messages.crossRoleEnabled': 'المراسلة متاحة بين جميع الأدوار',
    'messages.searchUsers': 'البحث في جميع المستخدمين (أي دور، أي قسم)...',
    'messages.enhancedMessaging': '✅ إمكانيات مراسلة محسنة',
    'messages.canSendToAny': 'يمكنك إرسال هذه الرسالة إلى أي مجموعة من المستخدمين عبر جميع الأدوار والأقسام',
    'messages.allContacts': 'جميع جهات الاتصال',
    'messages.searchContact': 'البحث في المستخدمين والأدوار والأقسام...',
    'messages.noContactsFound': 'لم يتم العثور على جهات اتصال',
    'messages.adjustSearch': 'جرب تعديل البحث',
    'messages.selected': 'محدد',
    'messages.crossRoleInfo': '✨ مراسلة محسنة بين الأدوار',
    'messages.canMessageAny': '• إرسال رسائل لأي مستخدم بغض النظر عن الدور أو القسم',
    'messages.allUsersCanCommunicate': '• جميع المستخدمين يمكنهم التواصل: المديرون، مديرو الأقسام، مكتب التنسيق، المستخدمون العاديون',
    'messages.noDepartmentRestriction': '• حدود الأقسام لا تقيد المراسلة',
    'messages.messageHistory': 'سجل الرسائل',
    'messages.fullHistory': '✓ سجل كامل للرسائل',
    'messages.new': 'جديد',
    'messages.unknownUser': 'مستخدم مجهول',
    'messages.unknownTime': 'وقت غير معروف',
    'messages.noSubject': 'بدون موضوع',
    'messages.noContent': 'بدون محتوى',
    'messages.to': 'إلى',
    'messages.from': 'من',
    'messages.admin': 'مدير النظام',
    'messages.adminDepartment': 'مدير القسم',
    'messages.adminTuningDesk': 'مكتب التنسيق',
    'messages.user': 'مستخدم',
    'messages.inactive': 'غير نشط',
    'messages.messageDeleted': 'تم حذف الرسالة',
    'messages.messageDeletedPermanently': 'تم حذف الرسالة نهائياً',
    'messages.messagesUpdated': 'تم تحديث الرسائل',
    'messages.messagesListUpdated': 'تم تحديث قائمة الرسائل الخاصة بك',
    'folders.title': 'إدارة المجلدات',
    'folders.createFolder': 'إنشاء مجلد',
    'folders.folderName': 'اسم المجلد',
    'folders.selectDepartment': 'اختر القسم',
    'folders.create': 'إنشاء',
    'folders.cancel': 'إلغاء',
    'folders.edit': 'تعديل',
    'folders.delete': 'حذف',
    'folders.confirmDelete': 'هل أنت متأكد من رغبتك في حذف هذا المجلد؟',
    'folders.folderCreated': 'تم إنشاء المجلد بنجاح',
    'folders.folderUpdated': 'تم تحديث المجلد بنجاح',
    'folders.folderDeleted': 'تم حذف المجلد بنجاح',
    'folders.createFolderFailed': 'فشل في إنشاء المجلد',
    'folders.updateFolderFailed': 'فشل في تحديث المجلد',
    'folders.deleteFolderFailed': 'فشل في حذف المجلد',
    'folders.errorLoading': 'خطأ في تحميل المجلدات. يرجى المحاولة مرة أخرى.',
    'folders.selectFolder': 'اختر مجلداً لعرض التفاصيل',
    'folders.folderDetails': 'تفاصيل المجلد',
    'folders.folderInformation': 'معلومات المجلد',
    'folders.folderDocuments': 'مستندات المجلد',
    'folders.name': 'الاسم',
    'folders.status': 'الحالة',
    'folders.documents': 'المستندات',
    'folders.created': 'تاريخ الإنشاء',
    'folders.department': 'القسم',
    'folders.createdBy': 'أنشئ بواسطة',
    'folders.statusInProgress': 'قيد التقدم',
    'folders.statusClosed': 'مغلق',
    'folders.createNewFolder': 'إنشاء مجلد جديد',
    'folders.editFolderName': 'تعديل اسم المجلد',
    'folders.update': 'تحديث',
    'folders.enterFolderName': 'أدخل اسم المجلد',
    'folders.enterFolderNameAndDepartment': 'يرجى إدخال اسم المجلد واختيار قسم',
    'folders.docs': 'مستند',
    'roles.Admin': 'مدير النظام',
    'roles.AdminDepartment': 'مدير القسم', 
    'roles.AdminTuningDesk': 'مكتب التنسيق',
    'roles.User': 'مستخدم',
    // Sidebar translations
    'sidebar.dmsSystem': 'نظام إدارة المستندات',
    'sidebar.documentManagement': 'إدارة المستندات',
    'sidebar.dashboard': 'لوحة التحكم',
    'sidebar.departments': 'الأقسام',
    'sidebar.users': 'المستخدمون',
    'sidebar.incomingDocuments': 'المستندات الواردة',
    'sidebar.outgoingDocuments': 'المستندات الصادرة',
    'sidebar.folders': 'المجلدات',
    'sidebar.advancedSearch': 'البحث المتقدم',
    'sidebar.messages': 'الرسائل',
    'sidebar.documentOptions': 'خيارات المستندات',
    'sidebar.departmentDashboard': 'لوحة تحكم القسم',
    'sidebar.toggle': 'تبديل الشريط الجانبي',
    'sidebar.collapse': 'طي الشريط الجانبي',
    'sidebar.expand': 'توسيع الشريط الجانبي',
    // Header translations
    'header.title': 'نظام إدارة المستندات',
    'header.departmentDashboard': 'لوحة تحكم القسم',
    'header.notifications': 'الإشعارات',
    'header.profile': 'الملف الشخصي',
    'header.logout': 'تسجيل الخروج',
    'header.menu': 'القائمة',
    'header.user': 'المستخدم',
    'header.welcome': 'مرحباً',
    'header.unreadMessages': 'رسائل غير مقروءة',
    'header.viewMessages': 'عرض الرسائل',
    'header.toggleSidebar': 'تبديل الشريط الجانبي'
  }
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState('ar'); // Always Arabic

  const t = (key: string): string => {
    return translations['ar']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: 'ar', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

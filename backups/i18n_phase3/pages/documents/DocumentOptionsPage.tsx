import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Sliders, 
  Layers, 
  Building2, 
  FileText, 
  Inbox, 
  Send, 
  Bookmark, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDocumentOptions, 
  createDocumentOption, 
  updateDocumentOption, 
  deleteDocumentOption, 
  DocumentOption 
} from '@/services/documentOptionsService';
import DocumentOptionDialog, { DocumentOptionFormData } from '@/components/documents/options/DocumentOptionDialog';
import DocumentOptionsList from '@/components/documents/options/DocumentOptionsList';
import { useAuth } from '@/contexts/AuthContext';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const DocumentOptionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DocumentOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: options = [], isLoading, error, refetch } = useQuery({
    queryKey: ['documentOptions'],
    queryFn: () => getDocumentOptions(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { category: string; documentType: string; value: string }) => 
      createDocumentOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم إنشاء خيار الوثيقة بنجاح');
      setIsDialogOpen(false);
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في إنشاء خيار الوثيقة');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { value?: string; isActive?: boolean; category?: string; documentType?: string } }) => 
      updateDocumentOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم تحديث خيار الوثيقة بنجاح');
      setIsDialogOpen(false);
      setEditingOption(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في تحديث خيار الوثيقة');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم حذف خيار الوثيقة بنجاح');
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في حذف خيار الوثيقة');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      updateDocumentOption(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم تحديث حالة خيار الوثيقة');
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في تحديث الحالة');
    }
  });

  // Permission verification
  if (currentUser?.role !== 'AdminTuningDesk') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8" dir="rtl">
        <div className="max-w-2xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-amber-50 border border-[#FFD758] flex items-center justify-center mx-auto text-[#78350f]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">الوصول مقيّد بالصلاحيات</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            إدارة خيارات وحقول الوثائق تتطلب صلاحية مكتب الضبط (AdminTuningDesk). يرجى مراجعة مسؤول النظام للحصول على الصلاحيات المطلوبة.
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = (data: DocumentOptionFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (option: DocumentOption) => {
    setEditingOption(option);
    setIsDialogOpen(true);
  };

  const handleUpdate = (data: DocumentOptionFormData) => {
    if (editingOption) {
      updateMutation.mutate({ id: editingOption._id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الخيار نهائياً؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  // Metrics calculation
  const totalCount = options.length;
  const activeCount = options.filter(o => o.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const categoryStats = {
    activity: options.filter(o => o.category === 'activity').length,
    source: options.filter(o => o.category === 'source').length,
    typeDocument: options.filter(o => o.category === 'typeDocument').length,
    assignedTo: options.filter(o => o.category === 'assignedTo').length,
    pourInfo: options.filter(o => o.category === 'pourInfo').length,
  };

  const categoryCards = [
    {
      id: 'activity',
      label: 'النشاط',
      description: 'تصنيف مجالات الأنشطة والمهام',
      icon: <Bookmark className="h-5 w-5" />,
      count: categoryStats.activity,
    },
    {
      id: 'source',
      label: 'المصدر / الجهة',
      description: 'الهيئات والمؤسسات المتعامل معها',
      icon: <Building2 className="h-5 w-5" />,
      count: categoryStats.source,
    },
    {
      id: 'typeDocument',
      label: 'نوع الوثيقة',
      description: 'المراسلات، التقارير والمذكرات',
      icon: <FileText className="h-5 w-5" />,
      count: categoryStats.typeDocument,
    },
    {
      id: 'assignedTo',
      label: 'مخصص إلى',
      description: 'المصالح والوحدات المعنية بالتوجيه',
      icon: <Inbox className="h-5 w-5" />,
      count: categoryStats.assignedTo,
    },
    {
      id: 'pourInfo',
      label: 'للإعلام',
      description: 'الجهات المعنية بالمتابعة والإعلام',
      icon: <Send className="h-5 w-5" />,
      count: categoryStats.pourInfo,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4" dir="rtl">
        <Loader2 className="h-10 w-10 text-[#2c5282] animate-spin" />
        <h2 className="text-xl font-bold text-[#1a202c]">جاري تحميل خيارات الوثائق...</h2>
        <p className="text-base text-[#4a5568]">يتم استرجاع فئات وخيارات حقول الوثائق من قاعدة البيانات</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-6 sm:p-8" dir="rtl">
        <div className="max-w-xl mx-auto bg-white border border-[#e2e8f0] rounded p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a202c]">تعذر تحميل البيانات</h2>
          <p className="text-base text-[#4a5568] leading-relaxed">
            حدث خطأ أثناء الاتصال بالخادم لجلب خيارات الوثائق. يرجى المحاولة مجدداً.
          </p>
          <Button
            onClick={() => refetch()}
            className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded transition-colors duration-200"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f7fafc] p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* 1. Page Institutional Header (En-tête) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2c5282] leading-normal flex items-center gap-2.5">
              إدارة خيارات وحقول الوثائق
            </h1>
            <p className="text-base text-[#4a5568] leading-relaxed mt-1">
              تخصيص وضبط القوائم المنسدلة للأنشطة، المصادر، أنواع الوثائق والجهات المسؤولة للوثائق الإدارية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button 
            onClick={() => {
              setEditingOption(null);
              setIsDialogOpen(true);
            }}
            className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>إضافة خيار جديد</span>
          </Button>
        </div>
      </div>

      {/* 2. Options Sections / Categories & Metrics Bar (Sections d'options) */}
      <div className="space-y-4">
        {/* Global Metric Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-[#718096]">إجمالي الخيارات المسجلة</span>
              <div className="text-2xl font-bold text-[#1a202c]">{totalCount}</div>
            </div>
            <span className="w-10 h-10 rounded bg-[#f7fafc] border border-[#e2e8f0] flex items-center justify-center text-[#2c5282]">
              <Layers className="h-5 w-5" />
            </span>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-[#718096]">الخيارات المفعلة (نشطة)</span>
              <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
            </div>
            <span className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium text-[#718096]">الخيارات المعطلة</span>
              <div className="text-2xl font-bold text-[#78350f]">{inactiveCount}</div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
              {inactiveCount} خيار
            </span>
          </div>
        </div>

        {/* Category Configuration Cards Grid */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1a202c]">
                أقسام وتصنيفات خيارات الوثائق
              </h2>
              <p className="text-sm text-[#4a5568] mt-0.5">
                اضغط على أي قسم للتصفية السريعة وعرض الخيارات التابعة له
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-[#2c5282] text-white'
                  : 'bg-gray-100 text-[#4a5568] hover:bg-gray-200'
              }`}
            >
              عرض الكل ({totalCount})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {categoryCards.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
                  className={`text-right p-4 rounded border transition-colors duration-200 flex flex-col justify-between min-h-[105px] ${
                    isSelected
                      ? 'border-[#2c5282] bg-blue-50/70'
                      : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 text-[#2c5282]">
                      {cat.icon}
                      <span className="font-bold text-base text-[#1a202c]">{cat.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      isSelected 
                        ? 'bg-[#FFCB56] text-[#78350f] border border-[#FFD758]'
                        : 'bg-gray-100 text-[#4a5568] border border-gray-200'
                    }`}>
                      {cat.count}
                    </span>
                  </div>
                  <p className="text-xs text-[#718096] mt-2 line-clamp-1 leading-relaxed">
                    {cat.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Document Options List Section (Actions / Tableau) */}
      <DocumentOptionsList
        options={options}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        isLoading={deleteMutation.isPending || toggleActiveMutation.isPending}
        selectedCategoryFilter={selectedCategory}
        onSelectCategoryFilter={setSelectedCategory}
      />

      {/* 4. Document Option Dialog (Création / Modification) */}
      <DocumentOptionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingOption ? handleUpdate : handleCreate}
        editingOption={editingOption}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingOption(null);
        }}
      />
    </div>
  );
};

export default DocumentOptionsPage;

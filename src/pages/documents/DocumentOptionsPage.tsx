import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Plus,
  SlidersHorizontal,
  Layers,
  Building2,
  FileText,
  Inbox,
  Send,
  Bookmark,
  ShieldAlert,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDocumentOptions,
  createDocumentOption,
  updateDocumentOption,
  deleteDocumentOption,
  DocumentOption,
} from '@/services/documentOptionsService';
import DocumentOptionDialog, {
  DocumentOptionFormData,
} from '@/components/documents/options/DocumentOptionDialog';
import DocumentOptionsList from '@/components/documents/options/DocumentOptionsList';
import { useAuth } from '@/contexts/AuthContext';
import { useDirection } from '@/i18n/useDirection';
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
  const { dir } = useDirection();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DocumentOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [optionIdToDelete, setOptionIdToDelete] = useState<string | null>(null);

  const { data: options = [], isLoading, error, refetch } = useQuery({
    queryKey: ['documentOptions'],
    queryFn: () => getDocumentOptions(),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { value?: string; isActive?: boolean; category?: string; documentType?: string };
    }) => updateDocumentOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم تحديث خيار الوثيقة بنجاح');
      setIsDialogOpen(false);
      setEditingOption(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في تحديث خيار الوثيقة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم حذف خيار الوثيقة بنجاح');
      setOptionIdToDelete(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'فشل في حذف خيار الوثيقة');
    },
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
    },
  });

  // Permission verification
  if (currentUser?.role !== 'AdminTuningDesk') {
    return (
      <div className="py-6" dir={dir}>
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 flex items-center justify-center mx-auto text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            الوصول مقيّد بالصلاحيات
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            إدارة خيارات وحقول الوثائق تتطلب صلاحية مكتب الضبط (AdminTuningDesk). يرجى مراجعة مسؤول النظام.
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = (data: DocumentOptionFormData) => {
    createMutation.mutate({
      category: data.category || 'activity',
      documentType: data.documentType || 'both',
      value: data.value || '',
    });
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
    setOptionIdToDelete(id);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const totalCount = options.length;
  const activeCount = options.filter((o) => o.isActive).length;
  const inactiveCount = totalCount - activeCount;

  const categoryTabs = [
    {
      id: 'all',
      label: 'الكل',
      icon: <Layers className="h-3.5 w-3.5" />,
      count: totalCount,
    },
    {
      id: 'activity',
      label: 'النشاط',
      icon: <Bookmark className="h-3.5 w-3.5" />,
      count: options.filter((o) => o.category === 'activity').length,
    },
    {
      id: 'source',
      label: 'المصدر / الجهة',
      icon: <Building2 className="h-3.5 w-3.5" />,
      count: options.filter((o) => o.category === 'source').length,
    },
    {
      id: 'typeDocument',
      label: 'نوع الوثيقة',
      icon: <FileText className="h-3.5 w-3.5" />,
      count: options.filter((o) => o.category === 'typeDocument').length,
    },
    {
      id: 'assignedTo',
      label: 'مخصص إلى',
      icon: <Inbox className="h-3.5 w-3.5" />,
      count: options.filter((o) => o.category === 'assignedTo').length,
    },
    {
      id: 'pourInfo',
      label: 'للإعلام',
      icon: <Send className="h-3.5 w-3.5" />,
      count: options.filter((o) => o.category === 'pourInfo').length,
    },
  ];

  if (isLoading) {
    return (
      <div
        className="py-16 flex flex-col items-center justify-center text-center space-y-3"
        dir={dir}
      >
        <Loader2 className="h-9 w-9 text-[#2c5282] dark:text-blue-400 animate-spin" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          جاري تحميل خيارات الوثائق...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8" dir={dir}>
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            تعذر تحميل البيانات
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            حدث خطأ أثناء جلب خيارات الوثائق. يرجى المحاولة مجدداً.
          </p>
          <Button
            onClick={() => refetch()}
            className="h-10 px-5 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-md"
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Compact Institutional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              خيارات وحقول الوثائق
            </h1>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 truncate">
              إدارة القوائم المنسدلة للأنشطة والمصادر وأنواع المراسلات
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingOption(null);
            setIsDialogOpen(true);
          }}
          className="h-10 px-4 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-md flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة خيار جديد</span>
        </Button>
      </div>

      {/* Single Unified Surface: Category Strip + Toolbar + Filters + Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden">
        {/* Category Filter Tabs */}
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categoryTabs.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-slate-200/90 dark:border-slate-700 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 border border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span className="text-[13px] opacity-75 tabular-nums">
                  (<bdi dir="ltr">{cat.count}</bdi>)
                </span>
              </button>
            );
          })}
        </div>

        {/* Document Options List (flat inside unified surface) */}
        <DocumentOptionsList
          options={options}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          isLoading={deleteMutation.isPending || toggleActiveMutation.isPending}
          selectedCategoryFilter={selectedCategory}
          onSelectCategoryFilter={setSelectedCategory}
          summaryCounts={{
            total: totalCount,
            active: activeCount,
            inactive: inactiveCount,
          }}
        />
      </div>

      {/* Document Option Dialog */}
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

      {/* Delete Option Confirmation AlertDialog */}
      <AlertDialog
        open={!!optionIdToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setOptionIdToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الخيار نهائياً؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (optionIdToDelete) {
                  deleteMutation.mutate(optionIdToDelete);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف نهائياً'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentOptionsPage;

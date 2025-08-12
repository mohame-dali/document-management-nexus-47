
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getDocumentOptions, createDocumentOption, updateDocumentOption, deleteDocumentOption, DocumentOption } from '@/services/documentOptionsService';
import DocumentOptionDialog from '@/components/documents/options/DocumentOptionDialog';
import DocumentOptionsList from '@/components/documents/options/DocumentOptionsList';
import { useAuth } from '@/contexts/AuthContext';

const DocumentOptionsPage = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<DocumentOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: options = [], isLoading, error } = useQuery({
    queryKey: ['documentOptions'],
    queryFn: () => getDocumentOptions(),
  });

  const createMutation = useMutation({
    mutationFn: createDocumentOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم إنشاء خيار الوثيقة بنجاح');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في إنشاء خيار الوثيقة');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDocumentOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم تحديث خيار الوثيقة بنجاح');
      setIsDialogOpen(false);
      setEditingOption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تحديث خيار الوثيقة');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم حذف خيار الوثيقة بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في حذف خيار الوثيقة');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      updateDocumentOption(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentOptions'] });
      toast.success('تم تحديث حالة خيار الوثيقة');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تحديث الحالة');
    }
  });

  // Check if user has permission to manage options
  if (currentUser?.role !== 'AdminTuningDesk') {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-800">الوصول مرفوض</h2>
            <p className="text-red-600">
              ليس لديك صلاحية لإدارة خيارات الوثائق.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleEdit = (option: DocumentOption) => {
    setEditingOption(option);
    setIsDialogOpen(true);
  };

  const handleUpdate = (data: any) => {
    if (editingOption) {
      updateMutation.mutate({ id: editingOption._id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الخيار؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const filteredOptions = options.filter(option => {
    if (selectedCategory !== 'all' && option.category !== selectedCategory) return false;
    if (selectedDocumentType !== 'all' && option.documentType !== selectedDocumentType && option.documentType !== 'both') return false;
    if (searchTerm && !option.value.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-800">خطأ</h2>
            <p className="text-red-600">
              فشل في تحميل خيارات الوثائق. يرجى المحاولة مرة أخرى.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">خيارات الوثائق</h1>
            <p className="text-blue-700">
              إدارة خيارات حقول الوثائق للوثائق الواردة والصادرة
            </p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            size="lg"
          >
            <Plus className="h-5 w-5 ml-2" />
            إضافة خيار جديد
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث في الخيارات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 border-gray-300 focus:border-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">جميع الفئات</option>
              <option value="activity">النشاط</option>
              <option value="source">المصدر</option>
              <option value="typeDocument">نوع الوثيقة</option>
              <option value="assignedTo">مخصص إلى</option>
              <option value="pourInfo">للإعلام</option>
            </select>

            <select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">جميع أنواع الوثائق</option>
              <option value="incoming">وارد</option>
              <option value="outgoing">صادر</option>
              <option value="both">كلاهما</option>
            </select>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300">
                المجموع: {filteredOptions.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options List */}
      <DocumentOptionsList
        options={filteredOptions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        isLoading={deleteMutation.isPending || toggleActiveMutation.isPending}
      />

      {/* Dialog */}
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

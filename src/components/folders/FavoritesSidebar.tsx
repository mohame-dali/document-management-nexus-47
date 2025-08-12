
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Star, 
  Folder, 
  Heart, 
  Pin, 
  X, 
  FolderOpen,
  Archive
} from 'lucide-react';
import { getFavoriteFolders, removeFromFavorites } from '@/services/favoritesService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DragDropWrapper from '@/components/common/DragDropWrapper';
import { handleDocumentDrop } from '@/services/dragDropService';

interface FavoritesSidebarProps {
  onFolderSelect?: (folder: any) => void;
  selectedFolderId?: string;
}

const FavoritesSidebar: React.FC<FavoritesSidebarProps> = ({
  onFolderSelect,
  selectedFolderId
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favoriteFolders'],
    queryFn: getFavoriteFolders,
    enabled: !!currentUser
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: removeFromFavorites,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteFolders'] });
      toast.success('تم إزالة المجلد من المفضلة');
    },
    onError: () => {
      toast.error('فشل في إزالة المجلد من المفضلة');
    }
  });

  const handleDocumentDropToFavorites = async (item: any) => {
    if (item.type === 'document') {
      // Remove document from current folder (set to null)
      const result = await handleDocumentDrop(
        item.data.id,
        item.data.type,
        null,
        currentUser?._id || ''
      );
      
      if (result.success) {
        toast.success('تم نقل المستند إلى غير مصنف');
        queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
        queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      } else {
        toast.error(result.message);
      }
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-yellow-500" />
          المجلدات المفضلة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 p-4">
            {/* Favorites Drop Zone */}
            <DragDropWrapper
              dropTypes={['document']}
              onDrop={handleDocumentDropToFavorites}
              className="mb-4"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
                <Heart className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-gray-600 font-medium">إسقاط المستندات هنا</p>
                <p className="text-xs text-gray-500">لإزالتها من المجلدات</p>
              </div>
            </DragDropWrapper>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-xs text-gray-500">جاري التحميل...</p>
              </div>
            ) : favorites?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد مجلدات مفضلة</p>
                <p className="text-xs mt-1">استخدم النجمة لإضافة مجلدات</p>
              </div>
            ) : (
              favorites?.map((favorite) => {
                const folder = favorite.folder;
                if (!folder) return null;

                const isSelected = selectedFolderId === folder._id;
                
                return (
                  <DragDropWrapper
                    key={favorite._id}
                    dropTypes={['document']}
                    onDrop={async (item) => {
                      if (item.type === 'document') {
                        const result = await handleDocumentDrop(
                          item.data.id,
                          item.data.type,
                          folder._id,
                          currentUser?._id || ''
                        );
                        
                        if (result.success) {
                          toast.success(`تم نقل المستند إلى مجلد "${folder.name}"`);
                          queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
                          queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
                        } else {
                          toast.error(result.message);
                        }
                      }
                    }}
                  >
                    <div
                      className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-yellow-50 border-yellow-200 shadow-sm' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => onFolderSelect?.(folder)}
                    >
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        {folder.status === 'Fermé' ? (
                          <Archive className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <FolderOpen className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{folder.name}</span>
                          <Pin className="h-3 w-3 text-yellow-500" />
                        </div>
                        <Badge 
                          variant={folder.status === 'En cours' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavoriteMutation.mutate(folder._id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </DragDropWrapper>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FavoritesSidebar;

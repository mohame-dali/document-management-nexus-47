
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, User, Building, MessageSquare } from "lucide-react";
import { formatArabicDate, formatArabicDateTime } from "@/utils/arabicDateFormatter";

interface DocumentDetailCardProps {
  document: any;
  type: 'incoming' | 'outgoing';
}

export function DocumentDetailCard({ document, type }: DocumentDetailCardProps) {
  const getStatusBadge = (status: string, type: 'incoming' | 'outgoing') => {
    if (type === 'incoming') {
      switch (status) {
        case 'pending':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">قيد الانتظار</Badge>;
        case 'reviewed':
          return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">تمت المراجعة</Badge>;
        case 'processing':
          return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">قيد المعالجة</Badge>;
        case 'completed':
          return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">مكتمل</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'draft':
          return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">مسودة</Badge>;
        case 'pending_approval':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">بانتظار الموافقة</Badge>;
        case 'approved':
          return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">معتمد</Badge>;
        case 'sent':
          return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">مرسل</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  return (
    <Card className="w-full animate-fade-in" dir="rtl">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl mb-1 font-cairo">
              {document.subject}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {type === 'incoming' ? 'وثيقة واردة' : 'وثيقة صادرة'} | {document.serialNumber}
            </CardDescription>
          </div>
          <div>
            {getStatusBadge(document.status, type)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 font-medium">
              {type === 'incoming' ? 'تاريخ الوصول' : 'تاريخ الإصدار'}:
            </span>
            <span className="text-sm">
              {formatArabicDate(type === 'incoming' ? document.arrivalDate : document.issueDate)}
            </span>
          </div>
          
          {/* Show activity date for incoming documents */}
          {type === 'incoming' && document.dateActivity && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">تاريخ النشاط:</span>
              <span className="text-sm">
                {formatArabicDate(document.dateActivity)}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {type === 'incoming' ? (
              <>
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">المصدر:</span>
                <span className="text-sm">{document.source}</span>
              </>
            ) : (
              <>
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600 font-medium">القسم:</span>
                <span className="text-sm">{document.source?.name || 'غير محدد'}</span>
              </>
            )}
          </div>
        </div>

        {document.description && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">الوصف</h3>
            <p className="text-sm text-gray-700">{document.description}</p>
          </div>
        )}

        {document.comments && document.comments.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              التعليقات ({document.comments.length})
            </h3>
            <div className="space-y-3">
              {document.comments.map((comment: any) => (
                <div key={comment._id} className="bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3" />
                    <span className="text-xs font-medium">{comment.author.name}</span>
                    <span className="text-xs text-gray-500">
                      {formatArabicDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        {document.createdBy && (
          <div className="text-xs text-gray-500">
            أنشأ بواسطة: {document.createdBy.name || 'النظام'}
          </div>
        )}
        {document.updatedAt && (
          <div className="text-xs text-gray-500">
            آخر تحديث: {formatArabicDate(document.updatedAt)}
          </div>
        )}
        {document.createdAt && (
          <div className="text-xs text-gray-500">
            تاريخ الإنشاء: {formatArabicDate(document.createdAt)}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default DocumentDetailCard;

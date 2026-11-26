import React, { useState } from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { 
  FileInput, 
  FileOutput, 
  Calendar, 
  Building2, 
  User, 
  Eye, 
  ExternalLink,
  Table as TableIcon, 
  Grid as GridIcon, 
  Loader2, 
  Search, 
  FileCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DocumentPreviewModal from './DocumentPreviewModal';
import { formatShortDate } from '@/utils/formatDate';

interface SearchResultsProps {
  incoming: IncomingDocument[];
  outgoing: OutgoingDocument[];
  isLoading: boolean;
  searchPerformed: boolean;
  totalCount?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
  lastElementRef?: (node: HTMLElement | null) => void;
  searchedKeyword?: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
  incoming, 
  outgoing, 
  isLoading, 
  searchPerformed,
  totalCount = 0,
  isFetchingNextPage = false,
  hasNextPage = false,
  onFetchNextPage,
  lastElementRef,
  searchedKeyword = ''
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [previewDoc, setPreviewDoc] = useState<(IncomingDocument | OutgoingDocument) | null>(null);
  const [previewType, setPreviewType] = useState<'incoming' | 'outgoing' | null>(null);

  const combinedResultsCount = incoming.length + outgoing.length;

  const handleOpenPreview = (doc: IncomingDocument | OutgoingDocument, type: 'incoming' | 'outgoing') => {
    setPreviewDoc(doc);
    setPreviewType(type);
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
    setPreviewType(null);
  };

  const formatDate = (dateString?: string) => {
    return formatShortDate(dateString, '-');
  };

  // State: Loading initial search
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-8 sm:p-12 min-h-[300px] flex flex-col items-center justify-center text-center" dir="rtl">
        <Loader2 className="h-8 w-8 text-[#2c5282] dark:text-sky-400 animate-spin mb-4" />
        <h3 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">جاري معالجة البحث المتقدم...</h3>
        <p className="text-base text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
          يتم فحص الوثائق الواردة والصادرة وقواعد بيانات النصوص المفهرسة عبر OCR
        </p>
      </div>
    );
  }

  // State: Initial - Search not performed yet
  if (!searchPerformed) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-8 sm:p-12 min-h-[300px] flex flex-col items-center justify-center text-center space-y-4" dir="rtl">
        <div className="w-14 h-14 rounded-lg bg-[#f7fafc] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-[#2c5282] dark:text-sky-400">
          <Search className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">جاهز للبحث المتقدم</h3>
          <p className="text-base text-slate-700 dark:text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
            استخدم النموذج أعلاه لتحديد الكلمات المفتاحية، السنوات الإدارية، أو الفلاتر الزمنية لعرض نتائج المطابقة.
          </p>
        </div>
      </div>
    );
  }

  // State: No results found
  if (combinedResultsCount === 0 && !isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-8 sm:p-12 min-h-[300px] flex flex-col items-center justify-center text-center space-y-4" dir="rtl">
        <div className="w-14 h-14 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-[#FFD758] dark:border-amber-800/70 flex items-center justify-center text-[#78350f] dark:text-amber-300">
          <Search className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#1a202c] dark:text-slate-100">لم يتم العثور على أي نتائج</h3>
          <p className="text-base text-slate-700 dark:text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
            لم تطابق أي وثيقة المعايير المحددة. جرب استخدام كلمات مفتاحية أخرى أو توسيع نطاق البحث الزمني.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100 leading-normal flex items-center gap-2">
              نتائج البحث
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
              تم العثور على وثائق مطابقة وفقاً للمعايير المدخلة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-semibold bg-[#FFCB56]/90 dark:bg-amber-950/60 text-[#78350f] dark:text-amber-300 border border-[#FFD758] dark:border-amber-800/70 tabular-nums">
            {totalCount || combinedResultsCount} وثيقة متطابقة
          </span>

          {/* View mode toggle */}
          <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-9 px-3 text-base flex items-center gap-1.5 transition-colors duration-150 ${
                viewMode === 'table'
                  ? 'bg-[#2c5282] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="عرض كجدول"
            >
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 text-base flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-700 transition-colors duration-150 ${
                viewMode === 'grid'
                  ? 'bg-[#2c5282] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="عرض كبطاقات"
            >
              <GridIcon className="h-4 w-4" />
              <span className="hidden sm:inline">بطاقات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Display */}
      {viewMode === 'table' ? (
        /* TABULAR VIEW - Professional AdminLTE Data Table */
        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
          <table className="w-full text-right border-collapse text-base">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[#1a202c] dark:text-slate-200">
                <th className="py-3.5 px-4 font-semibold text-sm">النوع</th>
                <th className="py-3.5 px-4 font-semibold text-sm">الرقم / السنة</th>
                <th className="py-3.5 px-4 font-semibold text-sm">الموضوع</th>
                <th className="py-3.5 px-4 font-semibold text-sm">الجهة / المصدر</th>
                <th className="py-3.5 px-4 font-semibold text-sm">التاريخ</th>
                <th className="py-3.5 px-4 font-semibold text-sm text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {/* Incoming Rows */}
              {incoming.map((doc, idx) => {
                const isLast = idx === incoming.length - 1 && outgoing.length === 0;
                return (
                  <tr 
                    key={`in-${doc._id}`}
                    ref={isLast ? lastElementRef : null}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors duration-150"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-300 border border-blue-200 dark:border-sky-800/70">
                        <FileInput className="h-3 w-3" />
                        واردة
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1a202c] dark:text-slate-100 whitespace-nowrap tabular-nums">
                      #{doc.serialNumber} / {doc.year}
                    </td>
                    <td className="py-3.5 px-4 text-[#2d3748] dark:text-slate-200 font-medium leading-relaxed max-w-xs md:max-w-md">
                      <div className="line-clamp-2">{doc.subject}</div>
                      {doc.typeDocument && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 block mt-0.5">
                          {doc.typeDocument}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {doc.source || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                      <bdi dir="ltr">{formatDate(doc.arrivalDate)}</bdi>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => handleOpenPreview(doc, 'incoming')}
                          className="h-11 px-3 text-sm font-semibold border-[#FFCB56] dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/50 text-[#78350f] dark:text-amber-300 hover:bg-[#FFCB56] dark:hover:bg-amber-900/70 rounded-lg transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          <span>معاينة</span>
                        </Button>
                        <Button
                          type="button"
                          size="default"
                          onClick={() => navigate(`/dashboard/incoming-documents/${doc._id}`)}
                          className="h-11 px-3 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>فتح</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Outgoing Rows */}
              {outgoing.map((doc, idx) => {
                const isLast = idx === outgoing.length - 1;
                const sourceName = typeof doc.source === 'object' ? doc.source?.name : doc.source;
                return (
                  <tr 
                    key={`out-${doc._id}`}
                    ref={isLast ? lastElementRef : null}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors duration-150"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
                        <FileOutput className="h-3 w-3" />
                        صادرة
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1a202c] dark:text-slate-100 whitespace-nowrap tabular-nums">
                      #{doc.serialNumber} / {doc.year}
                    </td>
                    <td className="py-3.5 px-4 text-[#2d3748] dark:text-slate-200 font-medium leading-relaxed max-w-xs md:max-w-md">
                      <div className="line-clamp-2">{doc.subject}</div>
                      {doc.typeDocument && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 block mt-0.5">
                          {doc.typeDocument}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {sourceName || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                      <bdi dir="ltr">{formatDate(doc.issueDate)}</bdi>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={() => handleOpenPreview(doc, 'outgoing')}
                          className="h-11 px-3 text-sm font-semibold border-[#FFCB56] dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/50 text-[#78350f] dark:text-amber-300 hover:bg-[#FFCB56] dark:hover:bg-amber-900/70 rounded-lg transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          <span>معاينة</span>
                        </Button>
                        <Button
                          type="button"
                          size="default"
                          onClick={() => navigate(`/dashboard/outgoing-documents/${doc._id}`)}
                          className="h-11 px-3 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-150 flex items-center gap-1.5"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>فتح</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD / GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incoming Documents */}
          {incoming.map((doc, idx) => {
            const isLast = idx === incoming.length - 1 && outgoing.length === 0;
            return (
              <div
                key={`in-${doc._id}`}
                ref={isLast ? lastElementRef : null}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-sky-950/60 text-[#2c5282] dark:text-sky-300 border border-blue-200 dark:border-sky-800/70">
                      <FileInput className="h-3 w-3" />
                      واردة
                    </span>
                    <span className="font-bold text-base text-[#1a202c] dark:text-slate-100 tabular-nums">
                      #{doc.serialNumber} / {doc.year}
                    </span>
                    {doc.typeDocument && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {doc.typeDocument}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#1a202c] dark:text-slate-100 leading-relaxed line-clamp-2">
                  {doc.subject}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 truncate tabular-nums">
                    <Calendar className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                    <bdi dir="ltr">{formatDate(doc.arrivalDate)}</bdi>
                  </div>
                  {doc.source && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                      <span className="truncate">{doc.source}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPreview(doc, 'incoming')}
                    className="h-9 px-3 text-sm font-semibold border-[#FFCB56] dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/50 text-[#78350f] dark:text-amber-300 hover:bg-[#FFCB56] dark:hover:bg-amber-900/70 rounded-lg transition-colors duration-150"
                  >
                    <Eye className="h-4 w-4 ml-1.5" />
                    معاينة سريعة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(`/dashboard/incoming-documents/${doc._id}`)}
                    className="h-9 px-4 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-150"
                  >
                    <ExternalLink className="h-4 w-4 ml-1.5" />
                    عرض الوثيقة
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Outgoing Documents */}
          {outgoing.map((doc, idx) => {
            const isLast = idx === outgoing.length - 1;
            const sourceName = typeof doc.source === 'object' ? doc.source?.name : doc.source;
            return (
              <div
                key={`out-${doc._id}`}
                ref={isLast ? lastElementRef : null}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
                      <FileOutput className="h-3 w-3" />
                      صادرة
                    </span>
                    <span className="font-bold text-base text-[#1a202c] dark:text-slate-100 tabular-nums">
                      #{doc.serialNumber} / {doc.year}
                    </span>
                    {doc.typeDocument && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {doc.typeDocument}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#1a202c] dark:text-slate-100 leading-relaxed line-clamp-2">
                  {doc.subject}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 truncate tabular-nums">
                    <Calendar className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                    <bdi dir="ltr">{formatDate(doc.issueDate)}</bdi>
                  </div>
                  {sourceName && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                      <span className="truncate">{sourceName}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPreview(doc, 'outgoing')}
                    className="h-9 px-3 text-sm font-semibold border-[#FFCB56] dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/50 text-[#78350f] dark:text-amber-300 hover:bg-[#FFCB56] dark:hover:bg-amber-900/70 rounded-lg transition-colors duration-150"
                  >
                    <Eye className="h-4 w-4 ml-1.5" />
                    معاينة سريعة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(`/dashboard/outgoing-documents/${doc._id}`)}
                    className="h-9 px-4 text-sm font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg transition-colors duration-150"
                  >
                    <ExternalLink className="h-4 w-4 ml-1.5" />
                    عرض الوثيقة
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination & Load More Section */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-base text-slate-700 dark:text-slate-300 tabular-nums">
          تم عرض <span className="font-semibold text-[#1a202c] dark:text-slate-100">{combinedResultsCount}</span> من أصل{' '}
          <span className="font-semibold text-[#1a202c] dark:text-slate-100">{totalCount || combinedResultsCount}</span> وثيقة
        </div>

        <div className="flex items-center gap-3">
          {hasNextPage && onFetchNextPage && (
            <Button
              type="button"
              onClick={onFetchNextPage}
              disabled={isFetchingNextPage}
              className="h-11 px-6 text-base font-semibold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 transition-colors duration-150"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري تحميل المزيد...</span>
                </>
              ) : (
                <span>تحميل المزيد من النتائج</span>
              )}
            </Button>
          )}

          {!hasNextPage && combinedResultsCount > 0 && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              تم الوصول لنهاية النتائج
            </span>
          )}
        </div>
      </div>

      {/* Quick Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        documentType={previewType}
        isOpen={Boolean(previewDoc)}
        onClose={handleClosePreview}
        highlightKeyword={searchedKeyword}
      />
    </div>
  );
};

export default SearchResults;

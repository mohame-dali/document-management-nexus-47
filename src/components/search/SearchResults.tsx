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
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
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
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
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
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
        dir={dir}
      >
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <TableSkeleton columns={6} rows={6} />
      </div>
    );
  }

  // State: Initial - Search not performed yet
  if (!searchPerformed) {
    return (
      <EmptyState
        dir={dir}
        icon={<Search className="h-6 w-6 text-[#2c5282] dark:text-sky-400" />}
        title={isFr ? 'Prêt pour la recherche avancée' : 'جاهز للبحث المتقدم'}
        description={
          isFr
            ? 'Utilisez le formulaire ci-dessus pour saisir des mots-clés, une année ou des filtres de date afin d’afficher les résultats.'
            : 'استخدم النموذج أعلاه لتحديد الكلمات المفتاحية، السنوات الإدارية، أو الفلاتر الزمنية لعرض نتائج المطابقة.'
        }
        className="rounded-xl shadow-xs py-14"
      />
    );
  }

  // State: No results found
  if (combinedResultsCount === 0 && !isLoading) {
    return (
      <EmptyState
        dir={dir}
        icon={<Search className="h-6 w-6 text-amber-600 dark:text-amber-300" />}
        title={isFr ? 'Aucun résultat trouvé' : 'لم يتم العثور على أي نتائج'}
        description={
          isFr
            ? 'Aucun document ne correspond aux critères sélectionnés. Essayez d’autres mots-clés ou élargissez la période.'
            : 'لم تطابق أي وثيقة المعايير المحددة. جرب استخدام كلمات مفتاحية أخرى أو توسيع نطاق البحث الزمني.'
        }
        className="rounded-xl shadow-xs py-14"
      />
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-6 sm:p-8 space-y-6" dir={dir}>
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a202c] dark:text-slate-100 leading-normal flex items-center gap-2">
              {isFr ? 'Résultats de recherche' : 'نتائج البحث'}
            </h2>
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
              {isFr ? 'Documents correspondants aux critères saisis' : 'تم العثور على وثائق مطابقة وفقاً للمعايير المدخلة'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-semibold bg-[#FFCB56]/90 dark:bg-amber-950/60 text-[#78350f] dark:text-amber-300 border border-[#FFD758] dark:border-amber-800/70 tabular-nums">
            {totalCount || combinedResultsCount} {isFr ? 'document(s)' : 'وثيقة متطابقة'}
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
              title={isFr ? 'Vue tableau' : 'عرض كجدول'}
            >
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{isFr ? 'Tableau' : 'جدول'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-9 px-3 text-base flex items-center gap-1.5 border-s border-slate-300 dark:border-slate-700 transition-colors duration-150 ${
                viewMode === 'grid'
                  ? 'bg-[#2c5282] text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={isFr ? 'Vue cartes' : 'عرض كبطاقات'}
            >
              <GridIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{isFr ? 'Cartes' : 'بطاقات'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Display */}
      {viewMode === 'table' ? (
        /* TABULAR VIEW - Professional AdminLTE Data Table */
        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-lg">
          <table className="w-full text-start border-collapse text-base">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[#1a202c] dark:text-slate-200">
                <th className="py-3.5 px-4 font-semibold text-sm">{isFr ? 'Type' : 'النوع'}</th>
                <th className="py-3.5 px-4 font-semibold text-sm">{isFr ? 'N° / Année' : 'الرقم / السنة'}</th>
                <th className="py-3.5 px-4 font-semibold text-sm">{isFr ? 'Objet' : 'الموضوع'}</th>
                <th className="py-3.5 px-4 font-semibold text-sm">{isFr ? 'Source / Service' : 'الجهة / المصدر'}</th>
                <th className="py-3.5 px-4 font-semibold text-sm">{isFr ? 'Date' : 'التاريخ'}</th>
                <th className="py-3.5 px-4 font-semibold text-sm text-center">{isFr ? 'Actions' : 'الإجراءات'}</th>
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
          {isFr ? (
            <>
              Affichage de <span className="font-semibold text-[#1a202c] dark:text-slate-100">{combinedResultsCount}</span> sur{' '}
              <span className="font-semibold text-[#1a202c] dark:text-slate-100">{totalCount || combinedResultsCount}</span> document(s)
            </>
          ) : (
            <>
              تم عرض <span className="font-semibold text-[#1a202c] dark:text-slate-100">{combinedResultsCount}</span> من أصل{' '}
              <span className="font-semibold text-[#1a202c] dark:text-slate-100">{totalCount || combinedResultsCount}</span> وثيقة
            </>
          )}
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
                  <span>{isFr ? 'Chargement...' : 'جاري تحميل المزيد...'}</span>
                </>
              ) : (
                <span>{isFr ? 'Charger plus de résultats' : 'تحميل المزيد من النتائج'}</span>
              )}
            </Button>
          )}

          {!hasNextPage && combinedResultsCount > 0 && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              {isFr ? 'Fin des résultats' : 'تم الوصول لنهاية النتائج'}
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

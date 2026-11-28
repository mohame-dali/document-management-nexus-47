import React, { useMemo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Users, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ChartPersonnel } from '@/services/organizationChartService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PersonnelAvatar from '../hr/PersonnelAvatar';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  matchesPersonnelQuery,
  resolveDepartmentManager,
} from '@/utils/organizationTemplatesUtils';

interface DepartmentNodeProps {
  data: {
    _id: string;
    name: string;
    unitType: 'bureau_ordre' | 'rh' | 'service';
    totalPersonnel: number;
    personnel: ChartPersonnel[];
    isDimmed?: boolean;
    onPersonnelClick?: (personnelId: string) => void;
  };
}

const DepartmentNode: React.FC<DepartmentNodeProps> = ({ data }) => {
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const [expanded, setExpanded] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const manager = useMemo(
    () => resolveDepartmentManager(data.personnel),
    [data.personnel]
  );

  const filteredModalPersonnel = useMemo(() => {
    const list = data.personnel || [];
    if (!modalSearch.trim()) return list;
    return list.filter((p) => matchesPersonnelQuery(p, modalSearch));
  }, [data.personnel, modalSearch]);

  const getBorderColor = () => {
    switch (data.unitType) {
      case 'bureau_ordre':
        return 'border-amber-300 dark:border-amber-700';
      case 'rh':
        return 'border-emerald-400 dark:border-emerald-700';
      case 'service':
      default:
        return 'border-slate-200 dark:border-slate-700';
    }
  };

  const getUnitLabel = (unitType: string) => {
    switch (unitType) {
      case 'bureau_ordre':
        return isFr ? "Bureau d'Ordre" : 'مكتب الضبط';
      case 'rh':
        return isFr ? 'Ressources Humaines' : 'الموارد البشرية';
      case 'service':
      default:
        return isFr ? 'Service' : 'مصلحة';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-2 ${getBorderColor()} rounded-lg shadow-sm hover:shadow-md p-4 w-[280px] text-start select-none transition-all duration-200 ${
        data.isDimmed ? 'opacity-40' : 'opacity-100'
      }`}
      dir={dir}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="space-y-1 mb-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
          {getUnitLabel(data.unitType)}
        </span>
        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug break-words">
          {data.name}
        </h4>
        {manager && (
          <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
            {isFr ? 'Resp.' : 'الرئيس'}:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {manager.prenom} {manager.nom}
            </span>
          </p>
        )}
      </div>

      {/* Staff count toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 hover:text-[#2c5282] dark:hover:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 transition-colors mt-2"
      >
        <span className="flex items-center gap-1.5 font-medium tabular-nums">
          <Users className="w-3.5 h-3.5 text-[#2c5282] dark:text-blue-400" />
          <span>
            {data.totalPersonnel}{' '}
            {isFr
              ? data.totalPersonnel <= 1
                ? 'agent'
                : 'agents'
              : data.totalPersonnel > 1
                ? 'موظفين'
                : 'موظف'}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
          {expanded ? (
            <>
              <span>{isFr ? 'Masquer' : 'إخفاء'}</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>{isFr ? 'Voir' : 'عرض'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </span>
      </button>

      {/* Collapsible list */}
      {expanded && (
        <div className="mt-3 border-t border-slate-200 dark:border-slate-800 pt-2 max-h-48 overflow-y-auto space-y-1 nodrag nowheel">
          {data.personnel && data.personnel.length > 0 ? (
            data.personnel.map((p) => (
              <div
                key={p._id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.onPersonnelClick) {
                    data.onPersonnelClick(p._id);
                  }
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors text-start"
                title={`${p.prenom} ${p.nom}`}
              >
                <PersonnelAvatar photo={p.photo} nom={p.nom} prenom={p.prenom} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {p.prenom} {p.nom}
                    </p>
                    {p.username && (
                      <span
                        dir="ltr"
                        className="inline-block shrink-0 max-w-[90px] truncate text-xs font-mono text-[#2c5282] dark:text-blue-300"
                      >
                        @{p.username}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {p.poste || (isFr ? 'Sans poste' : 'بدون خطة')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300 text-center py-2">
              {isFr ? 'Aucun agent affecté' : 'لا يوجد موظفون مسجلون'}
            </p>
          )}
          {data.totalPersonnel > 10 && (
            <div className="pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalSearch('');
                  setShowAllModal(true);
                }}
                className="w-full h-8 text-xs font-semibold text-[#2c5282] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                {isFr
                  ? `Voir toute la liste (${data.totalPersonnel})`
                  : `عرض القائمة الكاملة (${data.totalPersonnel})`}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="sm:max-w-[540px]" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
              <span>
                {isFr ? `Équipe — ${data.name}` : `قائمة موظفي ${data.name}`}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                ({data.personnel?.length || data.totalPersonnel})
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300">
              {isFr
                ? `Liste complète des membres rattachés (${data.personnel?.length || data.totalPersonnel})`
                : `القائمة الكاملة للموظفين المسجلين بهذا القسم (${data.personnel?.length || data.totalPersonnel})`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-1">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute start-3 top-3" />
            <Input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder={
                isFr ? 'Rechercher par nom ou poste...' : 'ابحث بالاسم أو الخطة...'
              }
              className="h-10 ps-9 border-slate-300 dark:border-slate-700 text-sm"
            />
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md mt-2">
            {filteredModalPersonnel.length > 0 ? (
              filteredModalPersonnel.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    setShowAllModal(false);
                    if (data.onPersonnelClick) {
                      data.onPersonnelClick(p._id);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-start"
                >
                  <PersonnelAvatar photo={p.photo} nom={p.nom} prenom={p.prenom} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {p.prenom} {p.nom}
                      </p>
                      {p.username && (
                        <span
                          dir="ltr"
                          className="inline-block shrink-0 max-w-[140px] truncate text-xs font-mono text-[#2c5282] dark:text-blue-300"
                        >
                          @{p.username}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {p.poste || (isFr ? 'Sans poste' : 'بدون خطة')}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-6">
                {isFr ? 'Aucun résultat correspondant' : 'لا توجد نتائج مطابقة للبحث'}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2.5 !h-2.5" />
    </div>
  );
};

export default DepartmentNode;

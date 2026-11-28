import type { Template } from '@/services/templateService';
import type { ChartDepartment, ChartPersonnel } from '@/services/organizationChartService';

export interface TemplateFileInfo {
  ext: string;
  label: string;
  badgeClass: string;
}

export function getTemplateFileInfo(fileName?: string): TemplateFileInfo {
  const cleanName = (fileName || '').trim();
  const lastDot = cleanName.lastIndexOf('.');
  const ext = lastDot >= 0 ? cleanName.slice(lastDot + 1).toUpperCase() : 'FILE';

  switch (ext) {
    case 'DOCX':
    case 'DOC':
      return {
        ext,
        label: ext,
        badgeClass:
          'bg-blue-50 text-[#1e3a5f] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70',
      };
    case 'PDF':
      return {
        ext,
        label: ext,
        badgeClass:
          'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70',
      };
    case 'XLSX':
    case 'XLS':
      return {
        ext,
        label: ext,
        badgeClass:
          'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
      };
    default:
      return {
        ext: ext || 'FILE',
        label: ext || 'FILE',
        badgeClass:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

export function formatTemplateFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function filterTemplates(
  templates: Template[],
  searchQuery: string,
  extensionFilter: string
): Template[] {
  const q = searchQuery.trim().toLowerCase();
  const extFilter = extensionFilter.trim().toUpperCase();

  return templates.filter((tpl) => {
    const fileInfo = getTemplateFileInfo(tpl.fileName);
    if (extFilter !== 'ALL' && fileInfo.ext !== extFilter) {
      return false;
    }

    if (!q) return true;

    const haystacks = [
      tpl.name,
      tpl.description || '',
      tpl.fileName || '',
      tpl.uploadedBy?.username || '',
    ];
    return haystacks.some((val) => val.toLowerCase().includes(q));
  });
}

const MANAGER_TITLE_PATTERN =
  /\b(chef\s*(?:de\s*)?(?:d[eé]partement|service|bureau|division)|responsable|directeur|directrice|manager|head)\b|رئيس\s*(?:قسم|مصلحة|مكتب|وحدة)|مدير(?:ة)?\s*(?:قسم|مصلحة)?|مسؤول(?:ة)?/i;

export function resolveDepartmentManager(
  personnel: ChartPersonnel[] | undefined
): ChartPersonnel | null {
  if (!personnel || personnel.length === 0) return null;
  const match = personnel.find((p) => MANAGER_TITLE_PATTERN.test(p.poste || ''));
  return match || null;
}

export function matchesPersonnelQuery(person: ChartPersonnel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fullName = `${person.prenom || ''} ${person.nom || ''}`.toLowerCase();
  const reverseName = `${person.nom || ''} ${person.prenom || ''}`.toLowerCase();
  const poste = (person.poste || '').toLowerCase();
  const username = (person.username || '').toLowerCase();
  const email = (person.emailPersonnel || '').toLowerCase();
  return (
    fullName.includes(q) ||
    reverseName.includes(q) ||
    poste.includes(q) ||
    username.includes(q) ||
    email.includes(q)
  );
}

export interface FilteredDepartmentResult {
  department: ChartDepartment;
  matchedByName: boolean;
  matchingPersonnel: ChartPersonnel[];
}

export function filterOrganizationDepartments(
  departments: ChartDepartment[],
  searchQuery: string
): FilteredDepartmentResult[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) {
    return departments.map((department) => ({
      department,
      matchedByName: false,
      matchingPersonnel: department.personnel || [],
    }));
  }

  return departments.reduce<FilteredDepartmentResult[]>((acc, department) => {
    const deptNameMatches = (department.name || '').toLowerCase().includes(q);
    const matchingPersonnel = (department.personnel || []).filter((p) =>
      matchesPersonnelQuery(p, q)
    );

    if (deptNameMatches || matchingPersonnel.length > 0) {
      acc.push({
        department,
        matchedByName: deptNameMatches,
        matchingPersonnel:
          matchingPersonnel.length > 0 ? matchingPersonnel : department.personnel || [],
      });
    }
    return acc;
  }, []);
}

import { describe, expect, it } from 'vitest';
import {
  filterOrganizationDepartments,
  filterTemplates,
  formatTemplateFileSize,
  getTemplateFileInfo,
  resolveDepartmentManager,
} from './organizationTemplatesUtils';
import type { Template } from '@/services/templateService';
import type { ChartDepartment } from '@/services/organizationChartService';

const makeTemplate = (overrides: Partial<Template>): Template => ({
  _id: 'tpl-1',
  name: 'طلب شهادة عمل',
  description: 'نموذج رسمي لطلب شهادة العمل',
  fileName: 'attestation.docx',
  filePath: '/uploads/templates/attestation.docx',
  fileSize: 20480,
  uploadedBy: { _id: 'u1', username: 'admin_bo' },
  downloads: 5,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

describe('organizationTemplatesUtils', () => {
  it('extracts uppercase file extensions and assigns style classes', () => {
    expect(getTemplateFileInfo('note_service.docx').ext).toBe('DOCX');
    expect(getTemplateFileInfo('formulaire.doc').ext).toBe('DOC');
    expect(getTemplateFileInfo('rapport.pdf').ext).toBe('PDF');
    expect(getTemplateFileInfo('suivi.xlsx').ext).toBe('XLSX');
    expect(getTemplateFileInfo('').ext).toBe('FILE');
  });

  it('formats file sizes cleanly', () => {
    expect(formatTemplateFileSize(0)).toBe('0 B');
    expect(formatTemplateFileSize(1536)).toBe('1.5 KB');
    expect(formatTemplateFileSize(2 * 1024 * 1024)).toBe('2 MB');
  });

  it('filters templates by query and file extension', () => {
    const items = [
      makeTemplate({ _id: '1', name: 'نموذج إرسالية', fileName: 'bordereau.docx' }),
      makeTemplate({ _id: '2', name: 'محضر جلسة', fileName: 'pv_reunion.doc' }),
      makeTemplate({
        _id: '3',
        name: 'طلب عطلة',
        description: 'مصلحة الموارد البشرية',
        fileName: 'conge.pdf',
      }),
    ];

    expect(filterTemplates(items, '', 'ALL')).toHaveLength(3);
    expect(filterTemplates(items, '', 'DOCX').map((t) => t._id)).toEqual(['1']);
    expect(filterTemplates(items, 'الموارد', 'ALL').map((t) => t._id)).toEqual(['3']);
    expect(filterTemplates(items, 'pv_reunion', 'DOC').map((t) => t._id)).toEqual(['2']);
  });

  it('resolves department manager from bilingual poste titles', () => {
    expect(
      resolveDepartmentManager([
        { _id: '1', nom: 'Benali', prenom: 'Sami', poste: 'Technicien' },
        { _id: '2', nom: 'Mansouri', prenom: 'Leila', poste: 'Chef de département' },
      ])?._id
    ).toBe('2');

    expect(
      resolveDepartmentManager([
        { _id: '3', nom: 'كريم', prenom: 'أحمد', poste: 'رئيس مصلحة الموارد البشرية' },
      ])?._id
    ).toBe('3');

    expect(
      resolveDepartmentManager([{ _id: '4', nom: 'Ali', prenom: 'Nour', poste: 'Agent' }])
    ).toBeNull();
  });

  it('filters organization departments by department name or member query', () => {
    const departments: ChartDepartment[] = [
      {
        _id: 'd1',
        name: 'الموارد البشرية (RH)',
        unitType: 'rh',
        totalPersonnel: 2,
        personnel: [
          { _id: 'p1', nom: 'Trabelsi', prenom: 'Amira', poste: 'Chef de service' },
          { _id: 'p2', nom: 'Gharbi', prenom: 'Youssef', poste: 'Gestionnaire' },
        ],
      },
      {
        _id: 'd2',
        name: 'المخبر (LABO)',
        unitType: 'service',
        totalPersonnel: 1,
        personnel: [{ _id: 'p3', nom: 'Khelifi', prenom: 'Rami', poste: 'Ingénieur' }],
      },
    ];

    const byMember = filterOrganizationDepartments(departments, 'Amira');
    expect(byMember).toHaveLength(1);
    expect(byMember[0].department._id).toBe('d1');
    expect(byMember[0].matchingPersonnel.map((p) => p._id)).toEqual(['p1']);

    const byDept = filterOrganizationDepartments(departments, 'LABO');
    expect(byDept).toHaveLength(1);
    expect(byDept[0].matchedByName).toBe(true);
    expect(byDept[0].matchingPersonnel).toHaveLength(1);
  });
});

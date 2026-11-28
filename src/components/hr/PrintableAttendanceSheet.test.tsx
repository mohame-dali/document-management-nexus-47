import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintableAttendanceSheet, MonthlyAttendanceSheetData } from './PrintableAttendanceSheet';

const baseReportData: MonthlyAttendanceSheetData = {
  year: 2026,
  month: 11,
  daysInMonth: 30,
  department: null,
  organization: {
    nomAdministration: 'Administration Test',
    logoAdministration: '',
  },
  weekendDays: [0, 6],
  holidays: [],
  leaveReasons: [],
  totalPersonnel: 3,
  records: [],
};

describe('PrintableAttendanceSheet', () => {
  it('renders clean Arabic reference line without mixed French parentheses and shows scoped department label', () => {
    const { container } = render(
      <PrintableAttendanceSheet
        reportData={baseReportData}
        language="ar"
        scopedDepartmentLabel="RH + Bureau Directeur + Bureau d'Ordre"
      />
    );

    expect(screen.getByText('المرجع : كشف المواظبة الشهري - نوفمبر 2026')).toBeInTheDocument();
    expect(container.textContent).not.toContain('(Novembre 2026)');
    expect(container.textContent).not.toContain('جميع الأقسام والمصالح');
    expect(screen.getAllByText("RH + Bureau Directeur + Bureau d'Ordre").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.no-print.print\\:hidden')).toBeTruthy();
  });

  it('renders clean French reference line without mixed-language parentheses', () => {
    const { container } = render(
      <PrintableAttendanceSheet
        reportData={baseReportData}
        language="fr"
        scopedDepartmentLabel="RH + Bureau Directeur & BO"
      />
    );

    expect(screen.getByText('Réf : Feuille de présence mensuelle - Novembre 2026')).toBeInTheDocument();
    expect(container.textContent).not.toContain('(Novembre 2026)');
    expect(container.textContent).not.toContain('Tous les départements');
  });
});

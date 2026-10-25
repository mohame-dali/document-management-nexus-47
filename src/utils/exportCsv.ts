/**
 * Export a collection of records to a CSV file (Excel-compatible UTF-8 with BOM).
 *
 * @param filename File name for the download (e.g. 'courriers-entrants.csv')
 * @param rows Array of objects to export
 */
export function exportToCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows || rows.length === 0) {
    console.warn('[exportToCsv] No rows to export');
    return;
  }

  // Collect all unique keys from all objects
  const headers = Array.from(
    new Set(
      rows.flatMap((row) =>
        Object.keys(row).filter((key) => !key.startsWith('_v') && key !== '__v')
      )
    )
  );

  if (headers.length === 0) {
    return;
  }

  // Format a single cell value for CSV
  const formatCell = (val: any): string => {
    if (val === null || val === undefined) {
      return '';
    }

    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }

    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return item.name || item.nom || item.title || item._id || JSON.stringify(item);
            }
            return String(item);
          })
          .join('; ');
      }
      return val.name || val.nom || val.title || val.username || val._id || JSON.stringify(val);
    }

    const str = String(val);
    // Escape double quotes and enclose in quotes if contains comma, quote, or newline
    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows: string[] = [];

  // Header line
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data lines
  for (const row of rows) {
    const line = headers.map((header) => formatCell(row[header])).join(',');
    csvRows.push(line);
  }

  // UTF-8 BOM (\uFEFF) ensures Excel opens Arabic and accented characters correctly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default exportToCsv;

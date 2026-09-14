import { useState, useEffect } from 'react';

export const useYearPersistence = (storageKey: string) => {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    // Try to load from sessionStorage first, fallback to current year
    const savedYear = sessionStorage.getItem(storageKey);
    return savedYear || new Date().getFullYear().toString();
  });

  // Update sessionStorage whenever year changes (only for valid 4-digit years)
  useEffect(() => {
    if (selectedYear.length === 4 && /^\d{4}$/.test(selectedYear)) {
      sessionStorage.setItem(storageKey, selectedYear);
    }
  }, [selectedYear, storageKey]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty value or valid 4-digit years
    if (value === '' || /^\d{1,4}$/.test(value)) {
      setSelectedYear(value);
    }
  };

  return {
    selectedYear,
    setSelectedYear,
    handleYearChange,
    isValidYear: selectedYear.length === 4 && /^\d{4}$/.test(selectedYear)
  };
};
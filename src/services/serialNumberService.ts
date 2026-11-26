import api from './apiService';

export type SerialDocumentType = 'incoming' | 'outgoing';

export const getNextSerialNumber = async (
  year: number,
  type: SerialDocumentType
): Promise<number> => {
  const response = await api.get('/serial-number/next', {
    params: { year, type },
  });
  const nextNumber =
    response.data?.data?.nextSerialNumber ?? response.data?.nextSerialNumber;
  return typeof nextNumber === 'number' && !Number.isNaN(nextNumber)
    ? nextNumber
    : 1;
};

export const validateSerialNumber = async (
  serialNumber: string | number,
  year: number,
  type: SerialDocumentType
): Promise<boolean> => {
  const response = await api.get('/serial-number/validate', {
    params: { serialNumber, year, type },
  });
  return Boolean(response.data?.data?.isValid ?? response.data?.isValid ?? true);
};

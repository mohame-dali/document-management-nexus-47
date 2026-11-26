export interface OfflineOcrService {
  cleanup: () => Promise<void>;
}

export const ocrService: OfflineOcrService = {
  cleanup: async (): Promise<void> => {
    // Cleanup placeholder for client OCR worker lifecycle
  },
};

export default ocrService;

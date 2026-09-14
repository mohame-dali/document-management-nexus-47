import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import ScannerSetup from '@/components/scanner/ScannerSetup';
import ScanSettingsComponent from '@/components/scanner/ScanSettings';
import ScanResult from '@/components/scanner/ScanResult';
import RecentScans from '@/components/scanner/RecentScans';

import { 
  getScannerStatus, 
  listScanners, 
  selectScanner, 
  scanDocument,
  scanTemporaryDocument,
  getRecentScans
} from '@/services/scannerService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

const translations = {
  title: 'مسح الوثائق',
  scannerSetup: 'إعداد الماسح الضوئي',
  availableScanners: 'الماسحات الضوئية المتاحة',
  noScannersDetected: 'لم يتم اكتشاف أي ماسح ضوئي',
  refreshScanners: 'تحديث قائمة الماسحات الضوئية',
  selectScanner: 'اختر ماسح ضوئي',
  scanSettings: 'إعدادات المسح',
  documentType: 'نوع المستند',
  incoming: 'وارد',
  outgoing: 'صادر',
  resolution: 'الدقة',
  format: 'الصيغة',
  scanDocument: 'بدء المسح',
  scanning: 'جاري المسح...',
  scanComplete: 'تم المسح بنجاح',
  scanFailed: 'فشل المسح',
  viewDocument: 'عرض المستند',
  createRecordFromScan: 'إنشاء سجل من المسح الضوئي',
  recentScans: 'عمليات المسح الأخيرة',
  noRecentScans: 'لا توجد عمليات مسح حديثة',
  scanInfo: 'معلومات المسح',
  ocrText: 'نص مستخرج من التعرف الضوئي على الحروف (OCR)',
  noOcrText: 'لم يتم استخراج أي نص',
  error: 'حدث خطأ',
  scannerSelected: 'تم اختيار الماسح الضوئي'
};

const ScanDocumentPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedScanner, setSelectedScanner] = useState('');
  const [scanSettings, setScanSettings] = useState({
    documentType: 'incoming',
    resolution: '300',
    format: 'pdf'
  });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);

  // Get scanner status
  const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['scannerStatus'],
    queryFn: getScannerStatus,
    meta: {
      onSuccess: (data) => {
        if (data.selectedDevice?.id) {
          setSelectedScanner(data.selectedDevice.id);
        }
      },
      onError: (error: Error) => {
        toast.error(`${translations.error}: ${error.message}`);
      }
    }
  });

  // List available scanners
  const { data: scannersData, isLoading: isScannersLoading, refetch: refetchScanners } = useQuery({
    queryKey: ['scanners'],
    queryFn: listScanners,
    meta: {
      onError: (error: Error) => {
        toast.error(`${translations.error}: ${error.message}`);
      }
    }
  });

  // Get recent scans
  const { data: recentScansData, isLoading: isRecentScansLoading, refetch: refetchRecentScans } = useQuery({
    queryKey: ['recentScans'],
    queryFn: () => getRecentScans(),
    meta: {
      onError: (error: Error) => {
        toast.error(`${translations.error}: ${error.message}`);
      }
    }
  });

  // Select scanner mutation
  const selectScannerMutation = useMutation({
    mutationFn: (deviceId: string) => selectScanner(deviceId),
    onSuccess: () => {
      toast.success(translations.scannerSelected);
      refetchStatus();
    },
    onError: (error: Error) => {
      toast.error(`${translations.error}: ${error.message}`);
    }
  });

  // Scan document mutation
  const scanDocumentMutation = useMutation({
    mutationFn: (options: any) => {
      return options.temporary 
        ? scanTemporaryDocument(options) 
        : scanDocument(options);
    },
    onSuccess: (response) => {
      setScanning(false);
      setProgress(100);
      setScanResult(response);
      toast.success(translations.scanComplete);
      refetchRecentScans();
    },
    onError: (error: Error) => {
      setScanning(false);
      setProgress(0);
      toast.error(`${translations.scanFailed}: ${error.message}`);
    }
  });

  // Handle scanner selection
  const handleSelectScanner = (deviceId: string) => {
    setSelectedScanner(deviceId);
    selectScannerMutation.mutate(deviceId);
  };

  // Handle refresh scanners
  const handleRefreshScanners = () => {
    refetchScanners();
  };

  // Handle scan settings change
  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings({
      ...scanSettings,
      [key]: value
    });
  };

  // Handle scan document
  const handleScanDocument = (temporary = false) => {
    setScanning(true);
    setProgress(10);

    const scanOptions = {
      ...scanSettings,
      temporary
    };

    // Simulate progress updates (actual progress should come from backend)
    const progressInterval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 15;
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return newProgress;
      });
    }, 1000);

    scanDocumentMutation.mutate(scanOptions);
  };

  // Handle create document from scan
  const handleCreateFromScan = () => {
    if (!scanResult) return;

    if (scanSettings.documentType === 'incoming') {
      navigate('/dashboard/incoming-documents/create', { 
        state: { 
          scanData: scanResult,
          autoFill: true
        } 
      });
    } else {
      navigate('/dashboard/outgoing-documents/create', { 
        state: { 
          scanData: scanResult,
          autoFill: true
        } 
      });
    }
  };

  // Handle select scan from recent scans
  const handleSelectScan = (scan: any) => {
    setScanResult(scan);
    setScanSettings({
      ...scanSettings,
      documentType: scan.documentType || 'incoming'
    });
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">{translations.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Setup */}
          <ScannerSetup
            t={translations}
            selectedScanner={selectedScanner}
            onSelectScanner={(deviceId) => {
              setSelectedScanner(deviceId);
              selectScannerMutation.mutate(deviceId);
            }}
            onRefreshScanners={refetchScanners}
            scannersData={scannersData || []}
            isScannersLoading={isScannersLoading}
          />

          {/* Scan Settings */}
          <ScanSettingsComponent
            t={translations}
            scanSettings={scanSettings}
            onSettingChange={(key: string, value: string) => {
              setScanSettings({
                ...scanSettings,
                [key]: value
              });
            }}
            onScanDocument={(temporary = false) => {
              setScanning(true);
              setProgress(10);

              const scanOptions = {
                ...scanSettings,
                temporary
              };

              // Simulate progress updates
              const progressInterval = setInterval(() => {
                setProgress(prevProgress => {
                  const newProgress = prevProgress + 15;
                  if (newProgress >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                  }
                  return newProgress;
                });
              }, 1000);

              scanDocumentMutation.mutate(scanOptions);
            }}
            selectedScanner={selectedScanner}
            scanning={scanning}
          />

          {/* Scan Progress & Result */}
          <ScanResult
            t={translations}
            scanning={scanning}
            progress={progress}
            scanResult={scanResult}
            onCreateFromScan={() => {
              if (!scanResult) return;

              if (scanSettings.documentType === 'incoming') {
                navigate('/dashboard/incoming-documents/create', { 
                  state: { 
                    scanData: scanResult,
                    autoFill: true
                  } 
                });
              } else {
                navigate('/dashboard/outgoing-documents/create', { 
                  state: { 
                    scanData: scanResult,
                    autoFill: true
                  } 
                });
              }
            }}
            API_URL={BASE_URL}
          />
        </div>

        {/* Right Sidebar with Recent Scans */}
        <div>
          <RecentScans
            t={translations}
            recentScansData={recentScansData || []}
            isRecentScansLoading={isRecentScansLoading}
            onSelectScan={(scan: any) => {
              setScanResult(scan);
              setScanSettings({
                ...scanSettings,
                documentType: scan.documentType || 'incoming'
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ScanDocumentPage;

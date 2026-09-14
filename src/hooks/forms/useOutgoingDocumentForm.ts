import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createOutgoingDocument } from '@/services/documentService';
import { getNextSerialNumber, validateSerialNumber } from '@/services/serialNumberService';

export const useOutgoingDocumentForm = (t: any, currentDepartmentId?: string, scanData?: any) => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanSettings, setScanSettings] = useState({
    resolution: '300',
    format: 'pdf'
  });
  const [isManualSerialNumber, setIsManualSerialNumber] = useState(false);
  
  // Schema using Zod for form validation - updated to support arrays
  const formSchema = z.object({
    serialNumber: z.string().min(1, t.required),
    subject: z.string().min(1, t.required),
    assignedTo: z.string().array().min(1, t.required),
    issueDate: z.date(),
    department: z.string().min(1, t.required),
    typeDocument: z.string().optional(),
    pourInfo: z.string().array().optional(),
  });

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: '',
      subject: '',
      assignedTo: [],
      issueDate: new Date(),
      department: currentDepartmentId || '',
      typeDocument: '',
      pourInfo: [],
    }
  });

  // Auto-update serial number when issue date changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'issueDate' && value.issueDate && !isManualSerialNumber) {
        const year = new Date(value.issueDate).getFullYear();
        if (!isNaN(year) && year > 1900) { // Basic year validation
          getNextSerialNumber(year, 'outgoing')
            .then(nextNumber => {
              // Set as plain number string
              form.setValue('serialNumber', nextNumber.toString());
            })
            .catch(error => {
              console.error('Error fetching next serial number:', error);
            });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isManualSerialNumber]);

  // Initial serial number fetch
  useEffect(() => {
    if (!isManualSerialNumber) {
      const currentDate = form.getValues('issueDate');
      if (currentDate) {
        const year = new Date(currentDate).getFullYear();
        if (!isNaN(year) && year > 1900) { // Basic year validation
          getNextSerialNumber(year, 'outgoing')
            .then(nextNumber => {
              // Set as plain number string
              form.setValue('serialNumber', nextNumber.toString());
            })
            .catch(error => {
              console.error('Error fetching initial serial number:', error);
            });
        }
      }
    }
  }, [form, isManualSerialNumber]);

  // Handle manual serial number input
  const handleSerialNumberChange = (value: string) => {
    setIsManualSerialNumber(!!value && value !== '');
    if (value && value.trim() !== '') {
      // Check if it's a valid number
      const numericValue = parseInt(value, 10);
      if (isNaN(numericValue) || numericValue <= 0) {
        form.setError('serialNumber', {
          type: 'manual',
          message: 'يجب أن يكون الرقم التسلسلي رقماً صحيحاً موجباً'
        });
        return;
      }
      
      const issueDate = form.getValues('issueDate');
      if (issueDate) {
        const year = new Date(issueDate).getFullYear();
        if (!isNaN(year) && year > 1900) { // Basic year validation
          validateSerialNumber(value, year, 'outgoing')
            .then(isValid => {
              if (!isValid) {
                form.setError('serialNumber', {
                  type: 'manual',
                  message: 'هذا الرقم التسلسلي موجود بالفعل لهذا العام'
                });
              } else {
                form.clearErrors('serialNumber');
              }
            })
            .catch(error => {
              console.error('Error validating serial number:', error);
            });
        }
      }
    } else {
      setIsManualSerialNumber(false);
      form.clearErrors('serialNumber');
    }
  };

  // Effect to handle scan data
  useEffect(() => {
    const dataToUse = scanData || scanResult;
    
    if (dataToUse) {
      console.log('Processing scan data:', dataToUse);
      setScanResult(dataToUse);
      
      // If we have a serial number from the scan, use it
      if (dataToUse.serialNumber && !isManualSerialNumber) {
        form.setValue('serialNumber', dataToUse.serialNumber.toString());
      }
      
      if (dataToUse.ocrText) {
        const text = dataToUse.ocrText.toLowerCase();
        const lines = text.split('\n');
        
        const subjectLine = lines.find(line => line.includes('subject:') || line.includes('re:'));
        if (subjectLine) {
          const subject = subjectLine.replace(/subject:|re:/i, '').trim();
          if (subject && !form.getValues('subject')) {
            form.setValue('subject', subject);
          }
        }
        
        const assignedToLine = lines.find(line => line.includes('to:') || line.includes('recipient:'));
        if (assignedToLine) {
          const assignedTo = assignedToLine.replace(/to:|recipient:/i, '').trim();
          if (assignedTo && !form.getValues('assignedTo').length) {
            form.setValue('assignedTo', [assignedTo]);
          }
        }
      }
    }
  }, [scanData, scanResult, form, isManualSerialNumber]);

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings({
      ...scanSettings,
      [key]: value
    });
  };

  const handleRemoveScan = () => {
    setScanResult(null);
  };

  const handleStartScan = (scanTemporaryDocumentMutation: any) => {
    setScanning(true);
    setScanProgress(10);
    
    const scanOptions = {
      documentType: 'outgoing',
      format: scanSettings.format,
      resolution: Number(scanSettings.resolution),
      temporary: true
    };
    
    const progressInterval = setInterval(() => {
      setScanProgress(prevProgress => {
        const newProgress = prevProgress + 15;
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return newProgress;
      });
    }, 500);
    
    scanTemporaryDocumentMutation.mutate(scanOptions, {
      onSuccess: (response: any) => {
        console.log('Scan mutation success:', response);
        setScanning(false);
        setScanProgress(100);
        
        // Handle both direct data and nested data response
        const scanData = response.data || response;
        setScanResult(scanData);
        toast.success(t.scanComplete);
        
        clearInterval(progressInterval);
        
        // Auto-fill form from OCR if available
        if (scanData?.ocrText) {
          const text = scanData.ocrText.toLowerCase();
          const lines = text.split('\n');
          
          const subjectLine = lines.find(line => line.includes('subject:') || line.includes('re:'));
          if (subjectLine) {
            const subject = subjectLine.replace(/subject:|re:/i, '').trim();
            if (subject && !form.getValues('subject')) {
              form.setValue('subject', subject);
            }
          }
          
          const assignedToLine = lines.find(line => line.includes('to:') || line.includes('recipient:'));
          if (assignedToLine) {
            const assignedTo = assignedToLine.replace(/to:|recipient:/i, '').trim();
            if (assignedTo && !form.getValues('assignedTo').length) {
              form.setValue('assignedTo', [assignedTo]);
            }
          }
        }
      },
      onError: (error: Error) => {
        console.error('Scan mutation error:', error);
        setScanning(false);
        setScanProgress(0);
        toast.error(`${t.scanFailed}: ${error.message}`);
        clearInterval(progressInterval);
      }
    });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      console.log('Form data:', data);
      const formData = new FormData();
      
      // Add all form fields to FormData - serial number as plain number
      formData.append('serialNumber', data.serialNumber);
      formData.append('subject', data.subject);
      
      // Handle multiple assignedTo values
      if (data.assignedTo && data.assignedTo.length > 0) {
        formData.append('assignedTo', data.assignedTo.join(','));
      }
      
      // Handle multiple pourInfo values
      if (data.pourInfo && data.pourInfo.length > 0) {
        formData.append('pourInfo', data.pourInfo.join(','));
      }
      
      // Format dates
      if (data.issueDate) {
        formData.append('issueDate', data.issueDate.toISOString());
      }
      
      // Department
      formData.append('departmentId', data.department);
      
      // Optional fields
      if (data.typeDocument) {
        formData.append('typeDocument', data.typeDocument);
      }
      
      // Add file from either regular upload or scan (now optional)
      if (selectedFiles.length > 0) {
        formData.append('document', selectedFiles[0]);
      } else if (scanResult && scanResult.filePath) {
        formData.append('scannedDocumentPath', scanResult.filePath);
        
        if (scanResult.ocrText) {
          formData.append('ocrText', scanResult.ocrText);
        }
        
        // If we have a serial number from the scan result, ensure it's used
        if (scanResult.serialNumber && !isManualSerialNumber) {
          formData.set('serialNumber', scanResult.serialNumber.toString());
        }
        
        // If we have a year from the scan result, add it
        if (scanResult.year) {
          formData.append('year', scanResult.year.toString());
        }
      }
      
      await createOutgoingDocument(formData);
      toast.success(t.createSuccess);
      navigate('/dashboard/outgoing-documents');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(t.createError);
    }
  };

  return {
    form,
    selectedFiles,
    activeTab,
    scanning,
    scanProgress,
    scanResult,
    scanSettings,
    handleFileSelect,
    handleScanSettingChange,
    handleStartScan,
    setActiveTab,
    onSubmit,
    handleSerialNumberChange,
    isManualSerialNumber,
    handleRemoveScan
  };
};

export default useOutgoingDocumentForm;

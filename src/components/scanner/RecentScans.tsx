
import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentScansProps {
  t: any;
  recentScansData: any[];
  isRecentScansLoading: boolean;
  onSelectScan: (scan: any) => void;
}

const RecentScans: React.FC<RecentScansProps> = ({
  t,
  recentScansData,
  isRecentScansLoading,
  onSelectScan
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.recentScans}</CardTitle>
      </CardHeader>
      <CardContent>
        {isRecentScansLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {recentScansData && recentScansData.length > 0 ? (
              <div className="space-y-3">
                {recentScansData.map((scan, index) => (
                  <div 
                    key={index} 
                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectScan(scan)}
                  >
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm truncate">
                        {scan.filePath ? scan.filePath.split('/').pop() : 'Unknown file'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(scan.timestamp || scan.createdAt || Date.now()).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                {t.noRecentScans}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentScans;

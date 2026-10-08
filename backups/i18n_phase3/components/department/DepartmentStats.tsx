import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getIncomingDocumentsList, getOutgoingDocumentsList } from '@/services/documentService';
import { getUsers } from '@/services/userService';
import { getFolders } from '@/services/folderService';
import { FileText, Send, Users, Folder, Building } from 'lucide-react';

const DepartmentStats: React.FC = () => {
  const { currentUser } = useAuth();

  const { data: incomingDocs } = useQuery({
    queryKey: ['incomingDocuments'],
    queryFn: () => getIncomingDocumentsList(),
    enabled: !!currentUser?.activeDepartment
  });

  const { data: outgoingDocs } = useQuery({
    queryKey: ['outgoingDocuments'],
    queryFn: () => getOutgoingDocumentsList(),
    enabled: !!currentUser?.activeDepartment
  });

  const { data: users } = useQuery({
    queryKey: ['departmentUsers'],
    queryFn: getUsers,
    enabled: !!currentUser?.activeDepartment && currentUser?.role === 'AdminDepartment'
  });

  const { data: folders } = useQuery({
    queryKey: ['departmentFolders'],
    queryFn: () => getFolders(currentUser?.activeDepartment?._id),
    enabled: !!currentUser?.activeDepartment
  });

  if (!currentUser?.activeDepartment) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Building className="h-8 w-8 mx-auto mb-2" />
            <p>No active department selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const thisYearIncoming = incomingDocs?.filter(doc => doc.year === currentYear) || [];
  const thisYearOutgoing = outgoingDocs?.filter(doc => doc.year === currentYear) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building className="h-5 w-5" />
        <h2 className="text-lg font-semibold">{currentUser.activeDepartment.name}</h2>
        <Badge variant={currentUser.activeDepartment.isActive ? "default" : "secondary"}>
          {currentUser.activeDepartment.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Documents</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisYearIncoming.length}</div>
            <p className="text-xs text-muted-foreground">
              Documents for {currentYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outgoing Documents</CardTitle>
            <Send className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisYearOutgoing.length}</div>
            <p className="text-xs text-muted-foreground">
              Documents for {currentYear}
            </p>
          </CardContent>
        </Card>

        {currentUser.role === 'AdminDepartment' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Department Users</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active users
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <Folder className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folders?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Organization folders
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepartmentStats;

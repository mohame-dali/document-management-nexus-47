
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getDepartments } from '@/services/departmentService';
import { assignResponsible } from '@/services/documentService';
import { getUsers } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { IncomingDocument, Department, User } from '@/types';

interface DocumentAssignmentProps {
  document: IncomingDocument;
  onAssignmentUpdate: () => void;
}

const DocumentAssignment: React.FC<DocumentAssignmentProps> = ({
  document,
  onAssignmentUpdate
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: currentUser?.role === 'AdminTuningDesk' || currentUser?.role === 'Admin'
  });

  const assignDepartmentsMutation = useMutation({
    mutationFn: async ({ documentId, departmentIds }: { documentId: string, departmentIds: string[] }) => {
      // This would need a new API endpoint for bulk department assignment
      const response = await fetch(`/api/incoming-documents/${documentId}/assign-departments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentIds })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      onAssignmentUpdate();
      toast.success('Document assigned to departments successfully');
    },
    onError: () => {
      toast.error('Failed to assign document to departments');
    }
  });

  const assignResponsibleMutation = useMutation({
    mutationFn: ({ documentId, userId }: { documentId: string, userId: string }) =>
      assignResponsible(documentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      onAssignmentUpdate();
      toast.success('Responsible user assigned successfully');
    },
    onError: () => {
      toast.error('Failed to assign responsible user');
    }
  });

  const handleAssignDepartments = () => {
    if (selectedDepartments.length === 0) {
      toast.error('Please select at least one department');
      return;
    }
    assignDepartmentsMutation.mutate({
      documentId: document._id,
      departmentIds: selectedDepartments
    });
  };

  const handleAssignResponsible = () => {
    if (!selectedResponsible) {
      toast.error('Please select a responsible user');
      return;
    }
    assignResponsibleMutation.mutate({
      documentId: document._id,
      userId: selectedResponsible
    });
  };

  // Only AdminTuningDesk and Admin can assign documents
  if (currentUser?.role !== 'AdminTuningDesk' && currentUser?.role !== 'Admin') {
    return null;
  }

  const getAssignedDepartments = () => {
    if (Array.isArray(document.assignedTo)) {
      return document.assignedTo.map(dept => dept.name).join(', ');
    }
    return 'None';
  };

  const getResponsibleUser = () => {
    if (document.responsibleUser) {
      if (typeof document.responsibleUser === 'string') {
        return document.responsibleUser;
      }
      return document.responsibleUser.username;
    }
    return 'None';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Department Assignment */}
        <div className="space-y-2">
          <Label>Assign to Departments</Label>
          <Select 
            value={selectedDepartments.join(',')} 
            onValueChange={(value) => setSelectedDepartments(value ? value.split(',') : [])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select departments..." />
            </SelectTrigger>
            <SelectContent>
              {departments?.map((dept: Department) => (
                <SelectItem key={dept._id} value={dept._id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAssignDepartments}
            disabled={assignDepartmentsMutation.isPending}
            className="w-full"
          >
            {assignDepartmentsMutation.isPending ? 'Assigning...' : 'Assign to Departments'}
          </Button>
        </div>

        {/* Responsible User Assignment */}
        <div className="space-y-2">
          <Label>Assign Responsible User</Label>
          <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
            <SelectTrigger>
              <SelectValue placeholder="Select responsible user..." />
            </SelectTrigger>
            <SelectContent>
              {users?.filter((user: User) => user.role === 'AdminDepartment' || user.role === 'User')
                .map((user: User) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.username} ({user.role}) - {Array.isArray(user.departments) ? user.departments.map(d => d.name).join(', ') : 'No departments'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAssignResponsible}
            disabled={assignResponsibleMutation.isPending}
            className="w-full"
          >
            {assignResponsibleMutation.isPending ? 'Assigning...' : 'Assign Responsible User'}
          </Button>
        </div>

        {/* Current Assignments Display */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Current Assignments:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Departments:</strong> {getAssignedDepartments()}
            </p>
            <p>
              <strong>Responsible:</strong> {getResponsibleUser()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentAssignment;

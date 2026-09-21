
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Building, ChevronDown, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Department } from '@/types';

// Type for department that can be either string ID or populated object
type DepartmentReference = string | Department;

const DepartmentSwitcher: React.FC = () => {
  const { currentUser, switchDepartment } = useAuth();

  // Debug logging
  console.log('DepartmentSwitcher - currentUser:', currentUser);
  console.log('DepartmentSwitcher - departments:', currentUser?.departments);
  console.log('DepartmentSwitcher - activeDepartment:', currentUser?.activeDepartment);

  // Only show for AdminDepartment users with multiple departments
  if (!currentUser || 
      currentUser.role !== 'AdminDepartment' || 
      !currentUser.departments ||
      currentUser.departments.length <= 1) {
    return null;
  }

  const handleDepartmentSwitch = async (departmentId: string) => {
    console.log('Attempting to switch to department:', departmentId);
    
    if (!departmentId || departmentId === 'undefined') {
      console.error('Invalid department ID:', departmentId);
      toast.error('خطأ: معرف القسم غير صالح');
      return;
    }

    try {
      await switchDepartment(departmentId);
      toast.success('تم تغيير القسم النشط بنجاح');
    } catch (error) {
      console.error('Department switch error:', error);
      toast.error('فشل في تغيير القسم');
    }
  };

  // Process departments - handle case where departments are ObjectId strings
  const processDepartments = (): Department[] => {
    if (!currentUser.departments) return [];
    
    return currentUser.departments.map((dept: DepartmentReference, index) => {
      // If department is already a populated object with _id and name
      if (dept && typeof dept === 'object' && '_id' in dept && 'name' in dept) {
        return dept as Department;
      }
      
      // If department is just an ObjectId string
      if (typeof dept === 'string') {
        return {
          _id: dept,
          name: `Department ${dept.slice(-4)}`,
          description: '',
          isActive: true,
          createdAt: new Date().toISOString()
        } as Department;
      }
      
      return null;
    }).filter((dept): dept is Department => dept !== null);
  };

  const validDepartments = processDepartments();
  console.log('Valid departments:', validDepartments);

  if (validDepartments.length <= 1) {
    return null;
  }

  // Handle activeDepartment which is now a populated Department object
  const getActiveDepartmentName = (): string => {
    if (!currentUser.activeDepartment) return 'لا يوجد قسم';
    
    // activeDepartment is a populated Department object
    if (typeof currentUser.activeDepartment === 'object' && 'name' in currentUser.activeDepartment) {
      return (currentUser.activeDepartment as Department).name;
    }
    
    return 'لا يوجد قسم';
  };

  const getActiveDepartmentId = (): string | null => {
    if (!currentUser.activeDepartment) return null;
    
    // activeDepartment is a populated Department object
    if (typeof currentUser.activeDepartment === 'object' && '_id' in currentUser.activeDepartment) {
      return (currentUser.activeDepartment as Department)._id;
    }
    
    return null;
  };

  return (
    <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-200">
      <Building className="h-4 w-4 text-blue-600" />
      <div className="text-sm text-blue-700 font-medium">إدارة الأقسام:</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between min-w-[180px] bg-white">
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                القسم النشط
              </Badge>
              <span className="font-medium">
                {getActiveDepartmentName()}
              </span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            تبديل القسم النشط
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {validDepartments.map((department) => {
            const deptId = department._id;
            const activeDeptId = getActiveDepartmentId();
            const isActive = activeDeptId === deptId;
            
            console.log('Rendering department:', department.name, 'ID:', deptId);
            
            return (
              <DropdownMenuItem
                key={deptId}
                onClick={() => handleDepartmentSwitch(deptId)}
                className="flex items-center justify-between cursor-pointer p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-right">{department.name}</span>
                    <span className="text-xs text-muted-foreground text-right">
                      {department.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                    {department.description && (
                      <span className="text-xs text-gray-500 text-right">
                        {department.description}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="text-xs text-blue-600">
        {validDepartments.length} أقسام متاحة
      </div>
    </div>
  );
};

export default DepartmentSwitcher;


import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getDepartments, updateDepartment } from '@/services/departmentService';
import DepartmentForm from '@/components/forms/DepartmentForm';
import { toast } from 'sonner';

const EditDepartment = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const handleSubmit = async (data: any) => {
    try {
      await updateDepartment(id!, data);
      toast.success('Department updated successfully');
      navigate('/dashboard/departments');
    } catch (error) {
      toast.error('Failed to update department');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const department = departments?.find(d => d._id === id);

  if (!department) {
    return <div>Department not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Department</h1>
      <DepartmentForm 
        initialData={department} 
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditDepartment;


import { createDepartment } from '@/services/departmentService';
import DepartmentForm from '@/components/forms/DepartmentForm';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CreateDepartment = () => {
  const navigate = useNavigate();

  const handleSubmit = async (data: any) => {
    try {
      await createDepartment(data);
      toast.success('Department created successfully');
      navigate('/dashboard/departments');
    } catch (error) {
      toast.error('Failed to create department');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create Department</h1>
      <DepartmentForm onSubmit={handleSubmit} />
    </div>
  );
};

export default CreateDepartment;

import { useLocation, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fafc] p-4 text-right" dir="rtl">
      <div className="text-center max-w-md w-full bg-white border border-[#e2e8f0] rounded shadow-sm p-8 space-y-5">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-100">
          <AlertTriangle className="h-8 w-8" />
        </div>
        
        <div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            خطأ 404 — الصفحة غير موجودة
          </span>
          <h1 className="text-xl font-bold text-[#1a202c] mt-3">
            الصفحة التي تبحث عنها غير متوفرة
          </h1>
          <p className="text-xs text-[#4a5568] mt-2 leading-relaxed">
            قد يكون الرابط خاطئاً أو تم نقل الصفحة أو حذفها من النظام.
          </p>
        </div>

        <div className="bg-[#f8fafc] border border-[#edf2f7] rounded p-2.5 text-xs text-[#718096]">
          المسار المطلوب: <span className="font-mono text-[11px] text-[#2c5282] font-semibold">{location.pathname}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button 
            asChild 
            className="w-full sm:w-auto bg-[#2c5282] hover:bg-[#2a4365] text-white text-xs h-9 px-4 font-medium"
          >
            <Link to="/dashboard">
              <Home className="h-4 w-4 ml-1.5" />
              لوحة القيادة
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto border-[#cbd5e1] text-[#4a5568] hover:bg-[#f7fafc] text-xs h-9 px-4 font-medium"
          >
            <ArrowLeft className="h-4 w-4 ml-1.5" />
            الرجوع للخلف
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

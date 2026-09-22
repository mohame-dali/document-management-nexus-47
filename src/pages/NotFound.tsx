
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log the 404 error
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Show toast notification for better UX
    toast({
      title: "الصفحة غير موجودة",
      description: `المسار ${location.pathname} غير موجود.`,
      variant: "destructive",
    });
  }, [location.pathname]);

  // Helper function to suggest a potential correct route
  const suggestCorrectRoute = () => {
    const path = location.pathname;
    
    // Check for common edit patterns and suggest correct routes
    if (path.includes('/incoming-documents/') && path.includes('/edit')) {
      const segments = path.split('/');
      const idIndex = segments.findIndex(segment => segment === 'incoming-documents') + 1;
      if (idIndex < segments.length) {
        const id = segments[idIndex];
        return `/dashboard/incoming-documents/${id}/edit`;
      }
      return "/dashboard/incoming-documents";
    }
    
    if (path.includes('/outgoing-documents/') && path.includes('/edit')) {
      const segments = path.split('/');
      const idIndex = segments.findIndex(segment => segment === 'outgoing-documents') + 1;
      if (idIndex < segments.length) {
        const id = segments[idIndex];
        return `/dashboard/outgoing-documents/${id}/edit`;
      }
      return "/dashboard/outgoing-documents";
    }
    
    // Handle unauthorized route
    if (path.includes('/unauthorized')) {
      return "/dashboard";
    }
    
    // Check for attachment access errors
    if (path.includes('/api/messages/attachments/')) {
      return "/dashboard/messages";
    }
    
    // If no specific suggestion, return dashboard
    return '/dashboard';
  };

  const getErrorMessage = () => {
    const path = location.pathname;
    
    if (path.includes('/api/messages/attachments/')) {
      return {
        title: "خطأ في الوصول للمرفق",
        description: "لا يمكن الوصول للمرفق المطلوب. قد يكون الملف محذوف أو المسار غير صحيح.",
        suggestion: "العودة للرسائل"
      };
    }
    
    if (path.includes('/unauthorized')) {
      return {
        title: "غير مخول للوصول",
        description: "ليس لديك الصلاحية للوصول لهذه الصفحة.",
        suggestion: "العودة للصفحة الرئيسية"
      };
    }
    
    if (path.includes('/edit') && (path.includes('/incoming-documents/') || path.includes('/outgoing-documents/'))) {
      return {
        title: "صفحة التعديل غير موجودة",
        description: "صفحة تعديل المستند غير موجودة أو المسار غير صحيح.",
        suggestion: "العودة للمستندات"
      };
    }
    
    return {
      title: "الصفحة غير موجودة",
      description: "عذراً! الصفحة التي تبحث عنها غير موجودة.",
      suggestion: "الذهاب للصفحة المقترحة"
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7fafc]" dir="rtl">
      <div className="text-center max-w-md w-full mx-4 p-6 bg-white border border-[#e2e8f0] rounded shadow-sm">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-16 w-16 text-amber-500" />
        </div>
        <h1 className="text-6xl font-bold text-[#1a202c] mb-4">404</h1>
        <h2 className="text-xl font-bold text-[#2d3748] mb-3">
          {errorInfo.title}
        </h2>
        <p className="text-[#4a5568] text-sm mb-4 leading-relaxed">
          {errorInfo.description}
        </p>
        <p className="text-xs text-[#718096] mb-6">
          المسار <span className="font-mono bg-[#edf2f7] px-1.5 py-0.5 rounded text-[#2d3748]">{location.pathname}</span> غير موجود.
          <br />
          {!location.pathname.startsWith('/dashboard') && !location.pathname.includes('/api/') && (
            <span className="block mt-2">
              قد تكون تبحث عن صفحة تتطلب بادئة /dashboard.
            </span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild className="h-11 px-6 bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium">
            <Link to={suggestCorrectRoute()}>
              <Home className="h-4 w-4 ml-2" />
              {errorInfo.suggestion}
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-11 px-6 border-[#e2e8f0] text-[#4a5568] hover:bg-[#f7fafc] rounded font-medium">
            <Link to="/">العودة للصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

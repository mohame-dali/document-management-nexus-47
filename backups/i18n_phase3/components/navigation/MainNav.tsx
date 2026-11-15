
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  FolderOpen, 
  Mail, 
  FileText, 
  Settings,
  Home,
  ScanLine, 
  Send,
  Menu,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const MainNav = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Define navigation items based on user role
  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment", "AdminTuningDesk", "User"],
    },
    {
      title: "Users",
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment"],
    },
    {
      title: "Departments",
      href: "/dashboard/departments",
      icon: <Settings className="h-5 w-5" />,
      roles: ["Director", "Admin"],
    },
    {
      title: "Incoming Docs",
      href: "/dashboard/incoming-documents",
      icon: <FileText className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment", "AdminTuningDesk", "User"],
    },
    {
      title: "Outgoing Docs",
      href: "/dashboard/outgoing-documents",
      icon: <Send className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment", "AdminTuningDesk", "User"],
    },
    {
      title: "Scan",
      href: "/dashboard/scan",
      icon: <ScanLine className="h-5 w-5" />,
      roles: ["Admin", "AdminTuningDesk"],
    },
    {
      title: "Folders",
      href: "/dashboard/folders",
      icon: <FolderOpen className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment", "AdminTuningDesk", "User"],
    },
    {
      title: "Messages",
      href: "/dashboard/messages",
      icon: <Mail className="h-5 w-5" />,
      roles: ["Director", "Admin", "AdminDepartment", "AdminTuningDesk", "User"],
      badge: "new" // Highlight messages as new feature
    },
    {
      title: "Audit Trail",
      href: "/dashboard/audit-trail",
      icon: <Shield className="h-5 w-5" />,
      roles: ["Director", "Admin"],
    },
  ];

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(
    (item) => currentUser && item.roles.includes(currentUser.role)
  );

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Desktop Navigation - Horizontal */}
      <div className="hidden md:flex">
        <NavigationMenu>
          <NavigationMenuList>
            {filteredNavItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <Link to={item.href}>
                  <NavigationMenuLink 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isActive(item.href) && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      {item.icon}
                      <span>{item.title}</span>
                      {item.badge === "new" && (
                        <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                          new
                        </span>
                      )}
                    </div>
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="تبديل القائمة">
              <Menu />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] sm:w-[300px]">
            <nav className="flex flex-col gap-4 mt-8">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent",
                    isActive(item.href) && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  {item.icon}
                  <span>{item.title}</span>
                  {item.badge === "new" && (
                    <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      new
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default MainNav;

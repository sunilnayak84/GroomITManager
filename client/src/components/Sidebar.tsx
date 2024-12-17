import { Home, Calendar, Users, PawPrint, LogOut, Package, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const mainLinks = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/appointments", icon: Calendar, label: "Appointments" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/services", icon: Calendar, label: "Services" },
    { href: "/staff", icon: Users, label: "Staff" },
    { href: "/pets", icon: PawPrint, label: "Pets" },
    { href: "/inventory", icon: Package, label: "Inventory" },
  ];

  const settingsLinks = [
    { href: "/settings/working-hours", icon: Calendar, label: "Working Hours" },
    { href: "/settings/categories", icon: Package, label: "Categories" },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [
      { href: "/settings/roles", icon: Shield, label: "Role Management" }
    ] : []),
  ];

  return (
    <div className="w-64 bg-white border-r h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <PawPrint className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">GroomIT</h1>
      </div>

      <nav className="flex-1">
        <div className="mb-6">
          {mainLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md mb-1 hover:bg-gray-100 transition-colors",
                location === link.href && "bg-primary/10 text-primary"
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
        </div>
        
        <div>
          <div className="px-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-500">Settings</h2>
          </div>
          {settingsLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md mb-1 hover:bg-gray-100 transition-colors",
                location === link.href && "bg-primary/10 text-primary"
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t pt-4">
        <div className="px-4 py-2 mb-4">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-medium">{user?.name}</p>
          <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

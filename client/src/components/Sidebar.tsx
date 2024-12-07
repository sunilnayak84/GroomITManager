import { Home, Calendar, Users, PawPrint, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useUser();

  const links = [
    { href: "/", icon: Home, label: "Dashboard" },
    { href: "/appointments", icon: Calendar, label: "Appointments" },
    { href: "/customers", icon: Users, label: "Customers" },
    { href: "/services", icon: Calendar, label: "Services" },
    { href: "/pets", icon: PawPrint, label: "Pets" },
  ];

  return (
    <div className="w-64 bg-white border-r h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <PawPrint className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">GroomIT</h1>
      </div>

      <nav className="flex-1">
        {links.map((link) => (
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

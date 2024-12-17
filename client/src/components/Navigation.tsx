import { Home, Calendar, Users, PawPrint, LogOut, Package, Shield, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar";

export default function Navigation() {
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
    { href: "/settings/inventory-categories", icon: Package, label: "Inventory Categories" },
    { href: "/settings/pet-breeds", icon: PawPrint, label: "Pet Breeds" },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [
      { href: "/settings/roles", icon: Shield, label: "Role Management" },
      { href: "/settings/user-management", icon: Users, label: "User Management" }
    ] : []),
  ];

  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2">
          <PawPrint className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">GroomIT</h1>
        </div>
      </SidebarHeader>

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href}>
                  <SidebarMenuButton
                    isActive={location === link.href}
                    tooltip={link.label}
                    className={cn(
                      "w-full",
                      location === link.href && "bg-primary/10 text-primary"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {settingsLinks.map((link) => (
              <SidebarMenuItem key={link.href}>
                <Link href={link.href}>
                  <SidebarMenuButton
                    isActive={location === link.href}
                    tooltip={link.label}
                    className={cn(
                      "w-full",
                      location === link.href && "bg-primary/10 text-primary"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarFooter className="border-t">
        <div className="px-4 py-2">
          <p className="text-sm text-muted-foreground">Logged in as</p>
          <p className="font-medium">{user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </SidebarFooter>
    </>
  );
}

import { Home, Calendar, Users, PawPrint, LogOut, Package, Shield, Gift, PersonStanding, Clock, CreditCard } from "lucide-react";
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
    { href: "/pets", icon: PawPrint, label: "Pets" },
    { href: "/walks", icon: PersonStanding, label: "Dog Walking" },
    { href: "/inventory", icon: Package, label: "Inventory" },
    { href: "/marketplace", icon: Gift, label: "Rewards" },
    { href: "/billing", icon: CreditCard, label: "Billing" }, // Added billing link
  ];

  const settingsLinks = [
    { href: "/settings/working-hours", icon: Calendar, label: "Working Hours" },
    { href: "/settings/categories", icon: Package, label: "Inventory Categories" },
    { href: "/settings/breeds", icon: PawPrint, label: "Pet Breeds" },
    { href: "/settings/loyalty", icon: Users, label: "Loyalty Program" },
    { href: "/settings/rewards", icon: Gift, label: "Rewards Management" },
    { href: "/services", icon: Calendar, label: "Services Management" },
    { href: "/staff", icon: Users, label: "Staff Management" },
    { href: "/staff-availability", icon: Clock, label: "Staff Availability" },
    { href: "/settings/role-management", icon: Shield, label: "Role Management" },
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
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              window.location.reload();
            }}
          >
            Refresh Role
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
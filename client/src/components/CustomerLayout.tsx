
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { CalendarDays, Home, LogOut, Pet, Settings, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/customer', icon: Home },
    { name: 'Appointments', href: '/customer/appointments', icon: CalendarDays },
    { name: 'My Pets', href: '/customer/pets', icon: Pet },
    { name: 'Profile', href: '/customer/profile', icon: User },
    { name: 'Settings', href: '/customer/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:flex h-screen w-72 flex-col fixed inset-y-0 z-50">
          <div className="flex flex-col flex-grow border-r bg-card px-2">
            <div className="h-16 flex items-center px-4">
              <h1 className="text-xl font-bold">Pet Care Portal</h1>
            </div>
            <div className="flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.name} to={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
            <div className="flex-shrink-0 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-72 flex-1">
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

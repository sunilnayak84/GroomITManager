
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { CalendarDays, Home, LogOut, Dog, Settings, User, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/customer', icon: Home },
    { name: 'Appointments', href: '/customer/appointments', icon: CalendarDays },
    { name: 'My Pets', href: '/customer/pets', icon: Dog },
    { name: 'Profile', href: '/customer/profile', icon: User },
    { name: 'Settings', href: '/customer/settings', icon: Settings },
  ];

  const NavLinks = () => (
    <div className="flex-1 space-y-1">
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
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Mobile Navigation */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card px-4 flex items-center justify-between z-50">
          <h1 className="text-xl font-bold">Pet Care Portal</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <div className="h-full flex flex-col">
                <div className="h-16 flex items-center px-4">
                  <h1 className="text-xl font-bold">Pet Care Portal</h1>
                </div>
                <NavLinks />
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
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex h-screen w-72 flex-col fixed inset-y-0 z-50">
          <div className="flex flex-col flex-grow border-r bg-card px-2">
            <div className="h-16 flex items-center px-4">
              <h1 className="text-xl font-bold">Pet Care Portal</h1>
            </div>
            <NavLinks />
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
        <div className="md:pl-72 flex-1 w-full">
          <div className="md:p-0 pt-16">
            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

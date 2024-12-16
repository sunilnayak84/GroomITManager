import { type PropsWithChildren } from "react";
import { NotificationsList } from "./NotificationsList";
import { useUser } from "@/hooks/use-user";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Navigation from "./Navigation";

export default function Layout({ children }: PropsWithChildren) {
  const { user } = useUser();

  return (
    <SidebarProvider defaultOpen>
      <div className="relative flex min-h-screen">
        <Sidebar className="border-r border-border/40 bg-background transition-all duration-300 ease-in-out">
          <SidebarContent>
            <Navigation />
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex w-full flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between gap-4 px-4">
              <SidebarTrigger />
              <div className="flex items-center gap-4">
                {user && <NotificationsList userId={user.id} />}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

import { type PropsWithChildren } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Navigation from "./Navigation";
import {Toaster} from "@/components/ui/toaster";
import WebSocketNotifications from "./WebSocketNotifications";

export default function Layout({ children }: PropsWithChildren) {
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
                <WebSocketNotifications maxNotifications={10} />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto w-full">
            <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4">
              {children}
            </div>
          </main>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
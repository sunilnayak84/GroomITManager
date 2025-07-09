import { type PropsWithChildren } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Navigation from "./Navigation";
import {Toaster} from "@/components/ui/toaster"; // Assuming Toaster component is in this location

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
            <div className="flex h-12 sm:h-14 items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4">
              <SidebarTrigger className="h-8 w-8 sm:h-10 sm:w-10" />
              <div className="flex items-center gap-2 sm:gap-4" />
            </div>
          </header>

          <main className="flex-1 overflow-auto w-full">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";
import NotificationsList from "./NotificationsList";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <div className="fixed left-0 top-0">
        <div>
          <Sidebar />
        </div>
      </div>
      <div className="flex-1 ml-[200px]">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-end items-center">
          <NotificationsList />
        </div>
        <div>
          <main className="p-6 bg-gray-50 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

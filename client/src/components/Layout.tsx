import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";
import { NotificationsList } from "./NotificationsList";
import { useUser } from "@/hooks/use-user";

export default function Layout({ children }: PropsWithChildren) {
  const { user } = useUser();

  return (
    <div className="min-h-screen flex">
      <div className="fixed left-0 top-0">
        <div>
          <Sidebar />
        </div>
      </div>
      <div className="flex-1 ml-[200px]">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-3 flex justify-end items-center">
          {user && <NotificationsList userId={user.id} />}
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

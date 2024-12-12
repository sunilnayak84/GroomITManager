import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <div className="fixed left-0 top-0">
        <div>
          <Sidebar />
        </div>
      </div>
      <div className="flex-1 ml-[200px]">
        <div>
          <main className="p-6 bg-gray-50 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

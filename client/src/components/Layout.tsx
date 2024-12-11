import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <div className="fixed left-0 top-0">
        <div className="scale-[0.7] origin-top-left">
          <Sidebar />
        </div>
      </div>
      <div className="flex-1 ml-[140px]">
        <div className="scale-[0.7] origin-top-left">
          <main className="p-6 bg-gray-50 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

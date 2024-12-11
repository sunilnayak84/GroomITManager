import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 relative">
        <div className="origin-top-left scale-[0.7] absolute w-[143%] h-[143%]">
          <main className="min-h-screen p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

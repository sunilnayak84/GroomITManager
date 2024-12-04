import { type PropsWithChildren } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
}

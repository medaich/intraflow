import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import SidebarContextProvider from "@/contexts/SidebarContext";
import { Outlet } from "react-router";
const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen">
      <SidebarContextProvider>
        <Sidebar />
        <div className="flex-1">
          <Header className="border-b-2 border-accent h-16 flex items-center" />
          <main className="p-8">
            <Outlet />
          </main>
        </div>
      </SidebarContextProvider>
    </div>
  );
};

export default DashboardLayout;

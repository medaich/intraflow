import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import SidebarContextProvider from "@/contexts/SidebarContext";
import { Outlet } from "react-router";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <SidebarContextProvider>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header className="border-b-2 border-accent h-16 flex items-center shrink-0 bg-background" />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarContextProvider>
    </div>
  );
};

export default DashboardLayout;

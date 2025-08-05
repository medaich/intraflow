import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import SidebarContextProvider from "@/contexts/SidebarContext";
const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen">
      <SidebarContextProvider>
        <Sidebar />
        <div className="flex-1">
          <Header className="border border-accent" />
          <main>main</main>
        </div>
      </SidebarContextProvider>
    </div>
  );
};

export default DashboardLayout;

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function Layout({children, params}) {
  const { shop } = await params;
  return (
    <SidebarProvider>
      <AppSidebar shop={shop} variant="inset"/>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

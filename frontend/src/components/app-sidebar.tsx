import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
// Removed TeamSwitcher for authenticated role-based rendering
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { getNavItems, getChatRooms, type Role } from "@/config/roleNavigation"
import { getAuth } from '@/lib/auth';
import { TeamSwitcher } from "./team-switcher"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const auth = getAuth();
  const user = React.useMemo(() => {
    const role = (auth.role || 'student') as Role;
    const name = auth.name || 'User';
    const email = auth.email || 'user@example.com';
    let image: string | undefined = undefined;
    if (auth.pic) {
      if (/^(http|data:)/i.test(auth.pic)) image = auth.pic;
      else {
        const base = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
        const root = base.replace(/\/api$/i, '');
        image = `${root}/${auth.pic.replace(/^\/+/, '')}`;
      }
    }
    return { role, name, email, image };
  }, [auth.role, auth.name, auth.id, auth.pic]);

  const navItems = React.useMemo(() => getNavItems(user.role), [user.role]);
  const chatRooms = React.useMemo(() => getChatRooms(user.role), [user.role]);

  return (
    <Sidebar collapsible="icon" {...props}>
  <SidebarHeader>
  <TeamSwitcher teams={[
    {
      name: "Ethiopian Defence University",
      email: "edu.edu",
      role: user.role,
      avatarUrl: user.image
    }
  ]} />
  </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavProjects projects={chatRooms} /> */}
      </SidebarContent>
      <SidebarFooter>
  <NavUser user={{ name: user.name, email: user.email, avatar: user?.image || '' }} />
      </SidebarFooter>
    </Sidebar>
  )
}


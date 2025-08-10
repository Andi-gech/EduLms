import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// LMS demo data for student
const data = {
  user: {
    name: "Jane Doe",
    email: "jane@student.edu",
    avatar: "/avatars/student.jpg",
  },
  teams: [
    {
      name: "Class of 2025",
      logo: GalleryVerticalEnd,
      plan: "Student",
    },
    {
      name: "Math Majors",
      logo: AudioWaveform,
      plan: "Student",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/home",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "Overview", url: "/home" },
        { title: "Notifications", url: "/notifications" },
      ],
    },
    {
      title: "Courses",
      url: "/courses",
      icon: BookOpen,
      items: [
        { title: "My Courses", url: "/courses" },
        { title: "Enrollments", url: "/enrollments" },
      ],
    },
    {
      title: "Exams",
      url: "/exams",
      icon: Bot,
      items: [
        { title: "Upcoming Exams", url: "/exams" },
        { title: "Results", url: "/results" },
      ],
    },
    {
      title: "Profile",
      url: "/profile",
      icon: Settings2,
      items: [
        { title: "Account", url: "/profile" },
        { title: "Settings", url: "/settings" },
      ],
    },
  ],
  projects: [
    {
      name: "Math 101",
      url: "/courses/1",
      icon: Frame,
    },
    {
      name: "CS 201",
      url: "/courses/2",
      icon: PieChart,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import * as React from "react"
import { BookCheck, Check } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface Team { 
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
}
interface TeamSwitcherProps { teams: Team[]; onChange?: (team: Team) => void }

export function TeamSwitcher({ teams, onChange }: TeamSwitcherProps) {
  const [activeTeam, setActiveTeam] = React.useState<Team | null>(() => teams[0] || null)

  React.useEffect(() => {
    if (!activeTeam && teams.length) setActiveTeam(teams[0])
  }, [teams, activeTeam])

  if (!activeTeam) return null

  const handleSelect = (team: Team) => {
    setActiveTeam(team)
    onChange?.(team)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
             <img src={"http://www.etdu.edu.et/wp-content/uploads/2023/12/new_logo.jpeg"} alt={activeTeam.name} className="h-8 w-8 rounded-lg object-cover" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.role}</span>
              </div>
              <BookCheck className="size-4 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="w-52">
            <DropdownMenuLabel className="text-xs font-medium">Switch Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map(t => {
              const active = t.name === activeTeam.name
              return (
                <DropdownMenuItem
                  key={t.name}
                  onSelect={(e) => { e.preventDefault(); handleSelect(t) }}
                  className={cn("flex items-center gap-2 text-xs cursor-pointer", active && "text-primary font-semibold")}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-[11px] font-semibold uppercase">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span>{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.role}</span>
                  </div>
                  {active && <Check className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

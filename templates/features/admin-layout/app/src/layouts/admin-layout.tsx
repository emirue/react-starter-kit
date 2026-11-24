// @if react-router
import { Link, Outlet, useLocation } from "react-router"
// @endif
// @if tanstack-router
import { Link, Outlet, useLocation } from "@tanstack/react-router"
// @endif
// @if example-pages
import { BookOpen, LayoutDashboard, Settings, Users } from "lucide-react"
// @endif
// @if examples && !example-pages
import { LayoutDashboard, Settings, Users } from "lucide-react"
// @endif
// @if !examples
import { LayoutDashboard, Settings } from "lucide-react"
// @endif

import { ModeToggle } from "@/components/theme/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { env } from "@/config/env"
import { useUiStore } from "@/stores/ui-store"

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  // @if examples
  { to: "/users", label: "Users", icon: Users },
  // @endif
  { to: "/settings", label: "Settings", icon: Settings },
  // @if example-pages
  { to: "/examples", label: "Examples", icon: BookOpen },
  // @endif
] as const

export function AdminLayout() {
  const { pathname } = useLocation()
  const open = useUiStore((s) => s.sidebarOpen)
  const setOpen = useUiStore((s) => s.setSidebarOpen)
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to))

  return (
    // The sidebar shows tooltips when collapsed; Radix requires a provider.
    <TooltipProvider>
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5 font-semibold">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
              {env.appName.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate group-data-[collapsible=icon]:hidden">{env.appName}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {/* @if ui-base */}
                    <SidebarMenuButton render={<Link to={item.to} />} isActive={isActive(item.to)} tooltip={item.label}>
                      <item.icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {/* @else */}
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {/* @endif */}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
            <Avatar className="size-7">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <span className="truncate group-data-[collapsible=icon]:hidden">Admin</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <ModeToggle />
        </header>
        <main id="main" className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  )
}

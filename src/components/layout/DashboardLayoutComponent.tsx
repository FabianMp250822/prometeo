
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, FileText, FilePieChart, User, LogOut, Loader2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[]; // Define which roles can see this item
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/summarize', label: 'Resumir Documento', icon: FileText },
  { href: '/dashboard/reports', label: 'Reportes', icon: FilePieChart },
  { href: '/dashboard/profile', label: 'Mi Perfil', icon: User },
];

export default function DashboardLayoutComponent({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-primary font-semibold">Cargando ConsorcioManager...</p>
      </div>
    );
  }

  if (!currentUser) {
     // This will be handled by the useEffect redirect, but as a fallback
    return null;
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const MobileSidebar = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 flex flex-col bg-sidebar text-sidebar-foreground w-[280px]">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="https://placehold.co/40x40.png?text=CM"
              alt="ConsorcioManager Logo"
              width={40}
              height={40}
              className="rounded"
              data-ai-hint="logo abstract"
            />
            <h1 className="text-xl font-headline font-semibold text-sidebar-primary-foreground">ConsorcioManager</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 overflow-y-auto p-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    className="w-full justify-start text-base"
                    isActive={pathname === item.href}
                    variant={pathname === item.href ? "default" : "ghost"}
                    asChild={false}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
          <Button onClick={logout} variant="ghost" className="w-full justify-start text-base hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </Button>
        </SidebarFooter>
      </SheetContent>
    </Sheet>
  );


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          className="hidden md:flex flex-col border-r border-sidebar-border shadow-lg"
        >
          <SidebarHeader className="p-4 border-b border-sidebar-border">
             <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <Image
                  src="https://placehold.co/40x40.png?text=CM"
                  alt="ConsorcioManager Logo"
                  width={40}
                  height={40}
                  className="rounded"
                  data-ai-hint="logo abstract"
                />
                <h1 className="text-xl font-headline font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden">
                  ConsorcioManager
                </h1>
              </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      className="w-full justify-start"
                      isActive={pathname === item.href}
                      tooltip={{children: item.label, side: 'right', className: 'bg-primary text-primary-foreground'}}
                      asChild={false}
                    >
                      <item.icon className="mr-3 group-data-[collapsible=icon]:mr-0 h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t border-sidebar-border">
            <SidebarMenuButton onClick={logout} className="w-full justify-start" 
              tooltip={{children: "Cerrar Sesión", side: 'right', className: 'bg-primary text-primary-foreground'}}
              asChild={false}
            >
              <LogOut className="mr-3 group-data-[collapsible=icon]:mr-0 h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-sm">
            <div className="flex items-center gap-2">
               <div className="md:hidden">
                <MobileSidebar />
              </div>
              <div className="hidden md:block">
                <SidebarTrigger />
              </div>
              <h1 className="text-lg font-semibold text-foreground md:text-xl font-headline">
                {navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.uid ? `https://avatar.vercel.sh/${userProfile.uid}.png` : undefined} alt={userProfile?.displayName || 'Usuario'} data-ai-hint="user avatar"/>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userProfile?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile?.displayName || 'Usuario'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize pt-1">
                      Rol: {userProfile?.role || 'No asignado'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

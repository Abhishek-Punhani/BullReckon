"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  TrendingUp,
  BarChart3,
  History,
  Shield,
  Bot,
  FlaskConical,
  LogOut,
  Blocks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get user directly from authService
  const user = authService.getUser();

  const handleLogout = async () => {
    await authService.logout();
    router.push("/auth/login");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/market", label: "Market", icon: TrendingUp },
    { href: "/history", label: "History", icon: History },
    { href: "/portfolio", label: "Portfolio", icon: Bot },
    { href: "/risk", label: "Risk", icon: Shield },
    { href: "/strategy", label: "Strategy", icon: Bot },
    { href: "/backtest", label: "Backtest", icon: FlaskConical },
    { href: "/no-code-builder", label: "Strategy Builder", icon: Blocks },
  ];

  const getInitials = () => {
    if (!user?.firstName && !user?.lastName && !user?.name) return "U";
    const name =
      user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`;
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          BullReckon
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Trading Platform</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // only compute active state after mount to avoid SSR/CSR mismatch
          const isActive = mounted && pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {/* Profile Section using user from authService. Render only after mount to avoid SSR mismatch */}
        {mounted && user && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar
              className="h-10 w-10 cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <AvatarImage src={user.photo || user.avatar || ""} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.name || `${user.firstName || ""} ${user.lastName || ""}`}
              </p>
              <p className="text-xs text-muted-foreground">View Profile</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-card lg:border-r lg:border-border trading-shadow">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between p-4 bg-card border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            BullReckon
          </h1>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

export default Navigation;

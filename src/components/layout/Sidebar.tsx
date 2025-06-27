import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Menu, 
  Map, 
  Hotel, 
  Wallet, 
  Calendar, 
  PackagePlus, 
  Settings, 
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const navItems = [
  { to: "/", label: "Itinerary", icon: Map },
  { to: "/accommodations", label: "Accommodations", icon: Hotel },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/timeline", label: "Timeline", icon: Calendar },
  { to: "/packing", label: "Packing List", icon: PackagePlus },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [open, setOpen] = useState<boolean>(
    () => JSON.parse(localStorage.getItem("sidebar:isOpen") ?? "true")
  );

  useEffect(() => {
    localStorage.setItem("sidebar:isOpen", String(open));
  }, [open]);

  const content = (
    <ScrollArea className="h-full p-4">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sand-100 text-earth-600"
                    : "text-sand-600 hover:bg-sand-50"
                )
              }
            >
              <IconComponent size={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <Separator className="my-2" />
        {/* Profile shortcut */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sand-100 text-earth-600"
                : "text-sand-600 hover:bg-sand-50"
            )
          }
        >
          <Avatar className="w-5 h-5">
            <AvatarImage 
              src={user?.user_metadata?.avatar_url} 
              alt={user?.user_metadata?.name || "Profile"} 
            />
            <AvatarFallback className="w-5 h-5 text-xs">
              <User size={12} />
            </AvatarFallback>
          </Avatar>
          <span>{user?.user_metadata?.name || "Profile"}</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sand-100 text-earth-600"
                : "text-sand-600 hover:bg-sand-50"
            )
          }
        >
          <Settings size={18} className="shrink-0" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </ScrollArea>
  );

  return (
    <>
      {/* Mobile trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-[280px]"
        >
          {content}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-0 h-screen w-[280px] bg-white shadow-lg ring-1 ring-sand-200/40 transition-transform z-[201]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
        {/* Collapse toggle button for desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="absolute top-4 right-4 h-8 w-8"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </aside>
    </>
  );
}
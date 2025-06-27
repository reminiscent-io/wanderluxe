import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Menu, 
  Calendar, 
  MessageCircle, 
  Lightbulb, 
  BarChart2, 
  Package, 
  Settings, 
  User,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Building,
  Car
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  tripId?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const tripNavItems = [
  { 
    id: "timeline", 
    label: "Timeline", 
    icon: Calendar,
    subItems: [
      { id: "trip-dates", label: "Trip Dates", icon: CalendarDays },
      { id: "accommodations", label: "Accommodations", icon: Building },
      { id: "transportation", label: "Transportation", icon: Car },
    ]
  },
  { id: "chat", label: "AI Assistant", icon: MessageCircle },
  { id: "vision-board", label: "Vision Board", icon: Lightbulb },
  { id: "budget", label: "Budget", icon: BarChart2 },
  { id: "booking", label: "Booking", icon: Package },
];

export default function Sidebar({ tripId, activeTab, onTabChange }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTabClick = (tabId: string) => {
    // Handle expanding/collapsing items with subitems
    const item = tripNavItems.find(item => item.id === tabId);
    if (item?.subItems) {
      const isExpanded = expandedItems.includes(tabId);
      if (isExpanded) {
        setExpandedItems(expandedItems.filter(id => id !== tabId));
      } else {
        setExpandedItems([...expandedItems, tabId]);
      }
    }
    
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleSubItemClick = (subItemId: string) => {
    if (onTabChange) {
      onTabChange(subItemId);
    }
  };

  const handleBackToTrips = () => {
    navigate('/my-trips');
  };

  const content = (
    <ScrollArea className="h-full p-4">
      <nav className="flex flex-col gap-1">
        {/* Back to trips button when in trip context */}
        {tripId && (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToTrips}
              className="flex items-center gap-3 justify-start px-3 py-2 text-sm font-medium text-sand-600 hover:bg-sand-50 w-full"
            >
              <ArrowLeft size={18} className="shrink-0" />
              <span>Back to Trips</span>
            </Button>
            <Separator className="my-2" />
          </>
        )}

        {/* Trip navigation items when in trip context */}
        {tripId ? (
          tripNavItems.map((item) => {
            const IconComponent = item.icon;
            const isExpanded = expandedItems.includes(item.id);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            return (
              <div key={item.id}>
                {hasSubItems ? (
                  <Collapsible open={isExpanded} onOpenChange={() => handleTabClick(item.id)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                          activeTab === item.id
                            ? "bg-sand-100 text-earth-600"
                            : "text-sand-600 hover:bg-sand-50"
                        )}
                      >
                        <IconComponent size={18} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isExpanded ? (
                          <ChevronDown size={16} className="shrink-0" />
                        ) : (
                          <ChevronRight size={16} className="shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 space-y-1 mt-1">
                      {item.subItems?.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleSubItemClick(subItem.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                              activeTab === subItem.id
                                ? "bg-sand-100 text-earth-600"
                                : "text-sand-600 hover:bg-sand-50"
                            )}
                          >
                            <SubIconComponent size={16} className="shrink-0" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <button
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                      activeTab === item.id
                        ? "bg-sand-100 text-earth-600"
                        : "text-sand-600 hover:bg-sand-50"
                    )}
                  >
                    <IconComponent size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            );
          })
        ) : (
          /* Global navigation items when not in trip context */
          <>
            <NavLink
              to="/my-trips"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sand-100 text-earth-600"
                    : "text-sand-600 hover:bg-sand-50"
                )
              }
            >
              <Package size={18} className="shrink-0" />
              <span>My Trips</span>
            </NavLink>
          </>
        )}
        
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

  // For trips view, show permanent sidebar on desktop and mobile sheet
  if (tripId) {
    return (
      <>
        {/* Mobile trigger for trips */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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

        {/* Desktop permanent sidebar for trips */}
        <aside className="hidden md:block fixed left-0 top-0 h-screen w-[280px] bg-white shadow-lg ring-1 ring-sand-200/40 z-[201]">
          {content}
        </aside>
      </>
    );
  }

  // For non-trip views, keep the original collapsible behavior
  const [open, setOpen] = useState<boolean>(
    () => JSON.parse(localStorage.getItem("sidebar:isOpen") ?? "true")
  );

  useEffect(() => {
    localStorage.setItem("sidebar:isOpen", String(open));
  }, [open]);

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

      {/* Desktop sidebar toggle button - when not in trips */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className={cn(
          "hidden md:flex fixed top-4 z-[202] h-8 w-8 bg-white shadow-md ring-1 ring-sand-200/40 hover:bg-sand-50 transition-all",
          open ? "left-[260px]" : "left-4"
        )}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar - when not in trips */}
      <aside
        className={cn(
          "hidden md:block fixed left-0 top-0 h-screen w-[280px] bg-white shadow-lg ring-1 ring-sand-200/40 transition-transform z-[201]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content}
      </aside>
    </>
  );
}
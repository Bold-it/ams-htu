import htuLogo from "@/assets/htu-logo.jpg";
import { useAuth } from "./AuthContext";
import { LogOut, User, ShieldCheck, History, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { LayoutDashboard } from "lucide-react";

export function Header() {
  const { role, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const isAdmin = role === "admin" || role === "super_admin" || role === "dean";
  const isSuperAdmin = role === "super_admin";

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full bg-primary border-b shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group transition-all">
            {/* HTU Logo */}
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white p-1.5 shadow-premium transition-transform group-hover:scale-110 group-hover:rotate-3">
              <img
                src={htuLogo}
                alt="Ho Technical University Logo"
                className="h-full w-full rounded-2xl object-contain"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-white md:text-2xl tracking-tighter leading-none hero-text-glow">
                HTU <span className="text-white font-light tracking-wide text-lg">ACCREDITATION</span>
              </h1>
              <p className="text-[10px] font-bold text-white md:text-[11px] tracking-[0.3em] uppercase mt-1">
                OFFICE OF THE PRO-VICE CHANCELLOR
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                {/* Navigation Menu */}
                <nav className="hidden md:flex items-center gap-1">
                  <Link to="/">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-white flex items-center gap-2 px-4 ${isActive('/') ? 'bg-primary-foreground/10 font-bold' : 'hover:bg-primary-foreground/5 opacity-80 hover:opacity-100'}`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-widest">Dashboard</span>
                    </Button>
                  </Link>

                  {isSuperAdmin && (
                    <>
                      <Link to="/user-management">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-white flex items-center gap-2 px-4 rounded-xl transition-all ${isActive('/user-management') ? 'bg-white/20 text-white font-bold shadow-inner' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-widest">Users</span>
                        </Button>
                      </Link>
                      <Link to="/audit-logs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-white flex items-center gap-2 px-4 rounded-xl transition-all ${isActive('/audit-logs') ? 'bg-white/20 text-white font-bold shadow-inner' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}`}
                        >
                          <History className="h-4 w-4" />
                          <span className="text-xs uppercase tracking-widest">Logs</span>
                        </Button>
                      </Link>
                    </>
                  )}
                </nav>

                <div className="hidden lg:block text-right pr-4 border-r border-white/10 mr-2">
                  <span className="block text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">
                    {isSuperAdmin ? "Super Admin" : role === "dean" ? "Faculty Dean" : isAdmin ? "Administrator" : "Viewer"}
                  </span>
                  <span className="block text-xs font-bold text-white">
                    {isSuperAdmin ? "System Master" : role === "dean" ? "Academic Oversight" : "Management Portal"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                    {(isAdmin || isSuperAdmin) && <ChangePasswordDialog />}

                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
                    title="Logout"
                    >
                    <LogOut className="h-5 w-5" />
                    </Button>
                </div>
              </>
            )}
          </div>
          {!isAuthenticated && (
            <div className="hidden items-center gap-3 md:flex">
                <div className="text-right">
                <span className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                    Institutional Portal
                </span>
                <span className="block text-xs font-bold text-white">
                    v1.0.4
                </span>
                </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

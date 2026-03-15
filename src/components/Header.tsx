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
  const isAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="header-gradient sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group transition-opacity hover:opacity-90">
            {/* HTU Logo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1 shadow-md transition-transform group-hover:scale-105">
              <img
                src={htuLogo}
                alt="Ho Technical University Logo"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground md:text-xl leading-tight">
                HTU Accreditation Monitoring System
              </h1>
              <p className="text-xs text-primary-foreground/80 md:text-sm font-medium">
                Quality Assurance Unit Dashboard
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <>
                {/* Navigation Menu */}
                <div className="flex items-center gap-1 mx-4 border-r border-white/20 pr-4">
                  <Link to="/">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`text-primary-foreground flex items-center gap-2 px-3 h-10 transition-all ${isActive('/') ? 'bg-white/20 font-bold' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden lg:inline text-sm">Dashboard</span>
                    </Button>
                  </Link>

                  {isSuperAdmin && (
                    <>
                      <Link to="/user-management">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-primary-foreground flex items-center gap-2 px-3 h-10 transition-all ${isActive('/user-management') ? 'bg-white/20 font-bold' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
                        >
                          <Users className="h-4 w-4" />
                          <span className="hidden lg:inline text-sm">Users</span>
                        </Button>
                      </Link>
                      <Link to="/audit-logs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-primary-foreground flex items-center gap-2 px-3 h-10 transition-all ${isActive('/audit-logs') ? 'bg-white/20 font-bold' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}`}
                        >
                          <History className="h-4 w-4" />
                          <span className="hidden lg:inline text-sm">Audit Trail</span>
                        </Button>
                      </Link>
                    </>
                  )}
                </div>

                <div className="hidden lg:block text-right">
                  <span className="block text-xs font-semibold text-primary-foreground uppercase tracking-wider">
                    {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Viewer"}
                  </span>
                  <span className="block text-[10px] text-primary-foreground/70 uppercase">
                    {isSuperAdmin ? "System Master" : "Quality Portal"}
                  </span>
                </div>

                {(isAdmin || isSuperAdmin) && <ChangePasswordDialog />}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-primary-foreground hover:bg-white/10"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
          {!isAuthenticated && (
            <div className="hidden items-center gap-3 md:flex">
              <div className="text-right">
                <span className="block text-sm font-semibold text-primary-foreground">
                  Ho Technical University
                </span>
                <span className="block text-xs text-primary-foreground/70">
                  Excellence in Technical Education
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

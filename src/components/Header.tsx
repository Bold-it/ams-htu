import htuLogo from "@/assets/htu-logo.jpg";

export function Header() {
  return (
    <header className="header-gradient sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* HTU Logo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1 shadow-md">
              <img
                src={htuLogo}
                alt="Ho Technical University Logo"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-foreground md:text-xl">
                Accreditation Monitoring System
              </h1>
              <p className="text-xs text-primary-foreground/80 md:text-sm">
                Quality Assurance Unit Dashboard
              </p>
            </div>
          </div>
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
        </div>
      </div>
    </header>
  );
}

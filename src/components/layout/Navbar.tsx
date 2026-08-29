import { Link, useLocation } from "wouter";
import { BarChart2, ArrowLeftRight, BookOpen } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/analyze", label: "Analyze", icon: BarChart2 },
    { href: "/compare", label: "Compare", icon: ArrowLeftRight },
    { href: "/about", label: "Methodology", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <span className="font-serif text-xl text-primary italic tracking-tight">ValuLens</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {active && (
                  <span className="absolute inset-x-1 -bottom-[1px] h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

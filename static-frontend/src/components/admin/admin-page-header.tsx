import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Plus, Download, Calendar } from "lucide-react";

// Matches client_designs admin page headers exactly
interface AdminPageHeaderProps {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchRedirectPath?: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  };
  secondaryActions?: React.ReactNode;
  children?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchRedirectPath,
  primaryAction,
  secondaryActions,
  children,
}: AdminPageHeaderProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchRedirectPath) {
      navigate(`${searchRedirectPath}?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
      {/* Left - Page Title */}
      <h1 className="text-[22px] font-black tracking-tight text-text-1">
        {title}
      </h1>
      
      {/* Right - Actions */}
      <div className="flex items-center gap-2.5">
        {/* Custom secondary actions */}
        {secondaryActions}
        
        {/* Children for flexible content */}
        {children}
        
        {/* Search Input - Desktop */}
        {showSearch && (
          <form onSubmit={handleSearch} className="hidden sm:block">
            <div className="h-10 w-[380px] rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 flex items-center gap-2.5 px-3.5 text-text-3 font-bold text-[13px]">
              <Search className="w-4 h-4 flex-shrink-0" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-text-3 text-text-1"
              />
            </div>
          </form>
        )}
        
        {/* Primary Action Button */}
        {primaryAction && (
          primaryAction.href ? (
            <Button 
              asChild 
              className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]"
            >
              <Link to={primaryAction.href}>
                {primaryAction.icon || <Plus className="w-4 h-4" />}
                {primaryAction.label}
              </Link>
            </Button>
          ) : (
            <Button 
              onClick={primaryAction.onClick}
              className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]"
            >
              {primaryAction.icon || <Plus className="w-4 h-4" />}
              {primaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

// Segment switcher for analytics pages - matches design
interface SegmentSwitcherProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentSwitcher({ options, value, onChange }: SegmentSwitcherProps) {
  return (
    <div className="h-10 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95 p-1 flex gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 px-3.5 rounded-[14px] font-bold text-[13px] transition-colors ${
            value === option.value
              ? "bg-primary text-white shadow-[0_12px_24px_rgba(47,111,237,0.24)]"
              : "text-text-2 hover:bg-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Date range button - matches design
export function DateRangeButton({ label = "Last 30 days", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="h-10 rounded-[16px] px-3.5 gap-2 font-bold text-[13px] border border-border/95 bg-white/95 dark:bg-card/95"
    >
      <Calendar className="w-4 h-4" />
      {label}
    </Button>
  );
}

// Export button - matches design
export function ExportButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="h-10 rounded-[16px] px-3.5 gap-2 font-bold text-[13px] border border-border/95 bg-white/95 dark:bg-card/95"
    >
      <Download className="w-4 h-4" />
      Export
    </Button>
  );
}

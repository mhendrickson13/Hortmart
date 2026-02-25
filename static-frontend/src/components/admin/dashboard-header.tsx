import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  currentDate?: string;
}

// Matches client_designs/admin_dashboard_desktop.html exactly
export function DashboardHeader({ userName, currentDate }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/manage-courses?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 h-14">
      {/* Left - Page Title */}
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-text-1">
          {userName ? t("admin.dashboardHeader.welcome", { name: userName }) : t("dashboard.title")}
        </h1>
        {currentDate && (
          <p className="text-[12px] font-extrabold text-text-3 mt-0.5">{currentDate}</p>
        )}
      </div>
      
      {/* Right - Actions */}
      <div className="flex items-center gap-2.5">
        {/* Search Input - Desktop */}
        <form onSubmit={handleSearch} className="hidden sm:block">
          <div className="h-10 w-[380px] rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 flex items-center gap-2.5 px-3.5 text-text-3 font-bold text-[13px]">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder={t("admin.dashboardHeader.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-text-3 text-text-1"
            />
          </div>
        </form>
        
        {/* Create Course Button */}
        <Button asChild className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]">
          <Link to="/manage-courses/new">
            <Plus className="w-4 h-4" />
            {t("admin.dashboardHeader.createCourse")}
          </Link>
        </Button>
      </div>
    </div>
  );
}

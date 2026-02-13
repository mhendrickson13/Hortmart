import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Search, X, ArrowLeft, Clock, TrendingUp, Loader2 } from "lucide-react";

interface MobileSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: "learner" | "admin";
}

const trendingSearches = [
  "JavaScript",
  "React",
  "Python",
  "Web Development",
  "Machine Learning",
  "UI/UX Design",
];

export function MobileSearchSheet({ isOpen, onClose, variant = "learner" }: MobileSearchSheetProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    // Load recent searches from localStorage
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Save to recent searches
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    
    // Navigate to search results
    setTimeout(() => {
      setIsSearching(false);
      onClose();
      if (variant === "admin") {
        navigate(`/manage-courses?q=${encodeURIComponent(searchQuery)}`);
      } else {
        navigate(`/courses?q=${encodeURIComponent(searchQuery)}`);
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  if (!mounted || !isOpen) return null;

  const content = (
    <div 
      className="fixed inset-0 z-[100] bg-white dark:bg-card animate-fade-in-up"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={variant === "admin" ? "Search courses..." : "Search for courses..."}
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted border-0 text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20 text-body-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {query && !isSearching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-text-3/20 flex items-center justify-center text-text-2 hover:bg-text-3/30 active:scale-95"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
            )}
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-70px)] overscroll-contain">
        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-caption font-semibold text-text-2">Recent Searches</h3>
              <button 
                type="button"
                onClick={clearRecentSearches}
                className="text-caption text-primary font-medium active:opacity-70"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-1">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSearch(search)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <Clock className="w-4 h-4 text-text-3 flex-shrink-0" />
                  <span className="text-body-sm text-text-1 text-left flex-1">{search}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = recentSearches.filter((_, i) => i !== index);
                      setRecentSearches(updated);
                      localStorage.setItem("recentSearches", JSON.stringify(updated));
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-text-3 hover:bg-muted active:scale-95"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending/Suggestions */}
        {!query && (
          <div className={cn("px-4 py-4", recentSearches.length > 0 && "border-t border-border/50")}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-caption font-semibold text-text-2">Trending</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSearch(suggestion)}
                  className="px-4 py-2.5 rounded-full bg-muted text-body-sm font-medium text-text-1 hover:bg-primary/10 hover:text-primary active:scale-95 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search hint when typing */}
        {query && (
          <div className="px-4 py-8 text-center">
            <p className="text-body-sm text-text-3">
              Press enter or tap search to find "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

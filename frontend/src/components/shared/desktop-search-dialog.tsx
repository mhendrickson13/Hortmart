"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Search, X, Clock, TrendingUp, Loader2, ArrowRight } from "lucide-react";

interface DesktopSearchDialogProps {
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

export function DesktopSearchDialog({ isOpen, onClose, variant = "learner" }: DesktopSearchDialogProps) {
  const router = useRouter();
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
      setTimeout(() => {
        inputRef.current?.focus();
        setQuery("");
      }, 100);
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

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

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
        router.push(`/manage-courses?q=${encodeURIComponent(searchQuery)}`);
      } else {
        router.push(`/courses?q=${encodeURIComponent(searchQuery)}`);
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className="relative w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={variant === "admin" ? "Search courses, users..." : "Search for courses..."}
            className="w-full h-14 pl-12 pr-12 bg-transparent border-b border-border text-body text-text-1 placeholder:text-text-3 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-text-2 hover:bg-muted/80"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          )}
        </form>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-3" />
                  <h3 className="text-caption font-semibold text-text-2">Recent Searches</h3>
                </div>
                <button 
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-caption text-primary font-medium hover:underline"
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
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <span className="text-body-sm text-text-1">{search}</span>
                    <ArrowRight className="w-4 h-4 text-text-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending/Suggestions */}
          {!query && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-caption font-semibold text-text-2">Trending Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSearch(suggestion)}
                    className="px-3 py-2 rounded-lg bg-muted text-body-sm font-medium text-text-1 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results preview when typing */}
          {query && (
            <div className="p-4">
              <button
                type="button"
                onClick={() => handleSearch(query)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-primary" />
                  <span className="text-body-sm text-text-1">
                    Search for "<span className="font-semibold text-primary">{query}</span>"
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between text-caption text-text-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">↵</kbd>
              to search
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">esc</kbd>
              to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

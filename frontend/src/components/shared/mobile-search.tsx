"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, X, ArrowLeft, Clock, TrendingUp } from "lucide-react";

interface MobileSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  defaultValue?: string;
  suggestions?: string[];
  recentSearches?: string[];
  className?: string;
}

export function MobileSearch({
  placeholder = "Search courses...",
  onSearch,
  defaultValue = "",
  suggestions = [],
  recentSearches = [],
  className,
}: MobileSearchProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      setIsExpanded(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch?.(suggestion);
    setIsExpanded(false);
  };

  // Collapsed state - just the search icon
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all",
          className
        )}
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  // Expanded state - full screen search
  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-card safe-area-inset animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <button
          onClick={() => setIsExpanded(false)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-2 hover:bg-muted active:scale-95 transition-all"
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
              placeholder={placeholder}
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-muted border-0 text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-text-3/20 flex items-center justify-center text-text-2 hover:bg-text-3/30"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-64px)]">
        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-caption font-semibold text-text-2">Recent</h3>
              <button className="text-caption text-primary font-medium">Clear all</button>
            </div>
            <div className="space-y-1">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <Clock className="w-4 h-4 text-text-3" />
                  <span className="text-body-sm text-text-1">{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending/Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-caption font-semibold text-text-2">Trending</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 rounded-full bg-muted text-caption font-medium text-text-1 hover:bg-primary/10 hover:text-primary active:scale-95 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results would go here when query is entered */}
        {query && (
          <div className="px-4 py-4">
            <p className="text-center text-body-sm text-text-3 py-8">
              Press enter to search for "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple inline search bar for use within pages
export function MobileSearchBar({
  placeholder = "Search...",
  value,
  onChange,
  onClear,
  className,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted border border-border/50 text-body-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-text-3/20 flex items-center justify-center text-text-2 hover:bg-text-3/30 active:scale-95"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";

interface CoursesSearchProps {
  totalCourses: number;
  categories: string[];
  currentFilters: {
    q?: string;
    category?: string;
    level?: string;
    priceRange?: string;
  };
}

const LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All Levels (Course)" },
];

const PRICE_RANGES = [
  { value: "all", label: "All Prices" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

export function CoursesSearch({ totalCourses, categories, currentFilters }: CoursesSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const [search, setSearch] = useState(currentFilters.q || "");
  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/courses?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: search || undefined });
  };

  const clearFilters = () => {
    setSearch("");
    startTransition(() => {
      router.push("/courses");
    });
  };

  const hasActiveFilters = currentFilters.q || currentFilters.category || currentFilters.level || currentFilters.priceRange;
  const filterCount = [currentFilters.q, currentFilters.category, currentFilters.level, currentFilters.priceRange].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Header - Mobile First */}
      <div>
        <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Courses</h1>
        <p className="text-body-sm text-text-2 mt-0.5">
          {isPending ? "Searching..." : `${totalCourses} courses available`}
        </p>
      </div>

      {/* Search & Filter Row - Mobile Optimized */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <Input
            placeholder="Search courses..."
            className="pl-9 pr-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                updateFilters({ q: undefined });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <Button 
          variant={showFilters || hasActiveFilters ? "default" : "secondary"} 
          size="icon"
          className="h-11 w-11 flex-shrink-0 relative"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {filterCount > 0 && !showFilters && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters Panel - Mobile Optimized */}
      {showFilters && (
        <div className="p-3 rounded-xl border border-border/95 bg-white/92 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-semibold text-text-1">Filters</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-caption text-primary font-semibold"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Filter Grid - Stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category Filter */}
            <div>
              <label className="text-caption font-semibold text-text-3 mb-1.5 block">Category</label>
              <select
                value={currentFilters.category || "all"}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="text-caption font-semibold text-text-3 mb-1.5 block">Level</label>
              <select
                value={currentFilters.level || "all"}
                onChange={(e) => updateFilters({ level: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="text-caption font-semibold text-text-3 mb-1.5 block">Price</label>
              <select
                value={currentFilters.priceRange || "all"}
                onChange={(e) => updateFilters({ priceRange: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Pills */}
      {hasActiveFilters && !showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption text-text-3">Filters:</span>
          {currentFilters.q && (
            <Pill size="sm" className="gap-1">
              Search: {currentFilters.q}
              <button onClick={() => updateFilters({ q: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </Pill>
          )}
          {currentFilters.category && (
            <Pill size="sm" className="gap-1">
              {currentFilters.category}
              <button onClick={() => updateFilters({ category: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </Pill>
          )}
          {currentFilters.level && (
            <Pill size="sm" className="gap-1">
              {currentFilters.level.replace("_", " ")}
              <button onClick={() => updateFilters({ level: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </Pill>
          )}
          {currentFilters.priceRange && (
            <Pill size="sm" className="gap-1">
              {currentFilters.priceRange === "free" ? "Free" : "Paid"}
              <button onClick={() => updateFilters({ priceRange: undefined })}>
                <X className="w-3 h-3" />
              </button>
            </Pill>
          )}
          <button
            onClick={clearFilters}
            className="text-caption text-primary font-semibold hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSearchProps {
  initialSearchQuery?: string;
}

export function DashboardSearch({
  initialSearchQuery = "",
}: DashboardSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isTyping, setIsTyping] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update local state when URL changes
  useEffect(() => {
    const urlSearchQuery = searchParams.get("search") || "";
    setSearchQuery(urlSearchQuery);
  }, [searchParams]);

  // Update URL when search changes (debounced)
  const updateSearchQuery = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Debounced search update
  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => {
        updateSearchQuery(searchQuery);
        setIsTyping(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, isTyping]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsTyping(true);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsTyping(false);
    updateSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateSearchQuery(searchQuery);
      setIsTyping(false);
    }
  };

  // Add keyboard shortcut to focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div className="flex-1 w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search passwords..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="px-4 py-2 border border-input focus:border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-ring w-full"
          ref={searchInputRef}
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="top-1/2 right-3 absolute text-muted-foreground hover:text-foreground -translate-y-1/2 transform"
          >
            ✕
          </button>
        )}
        {isTyping && (
          <div className="top-1/2 right-8 absolute -translate-y-1/2 transform">
            <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

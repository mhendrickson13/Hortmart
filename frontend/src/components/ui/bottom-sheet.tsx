"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxHeight?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  maxHeight = "85vh",
  showHandle = true,
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 280);
  };

  // Touch handlers for swipe to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentYRef.current - startYRef.current;
    if (diff > 100) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startYRef.current = 0;
    currentYRef.current = 0;
  };

  if (!mounted || !isOpen) return null;

  const content = (
    <div 
      className={cn(
        "fixed inset-0 z-50 transition-opacity duration-200",
        isClosing ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-white dark:bg-card rounded-t-[28px] overflow-hidden transition-transform duration-300 ease-out safe-area-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.15)]",
          isClosing ? "translate-y-full" : "translate-y-0 animate-slide-in-bottom",
          className
        )}
        style={{ maxHeight }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-9 h-1 bg-text-3/25 rounded-full" />
          </div>
        )}
        
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-border/40">
            <div>
              {title && (
                <h3 className="text-[17px] font-black text-text-1">{title}</h3>
              )}
              {subtitle && (
                <p className="text-[13px] text-text-3 mt-0.5">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button 
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-muted/80 flex items-center justify-center text-text-2 hover:bg-muted hover:text-text-1 active:scale-95 transition-all touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

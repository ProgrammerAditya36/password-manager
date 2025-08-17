"use client";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type AnimationVariant = "circle" | "circle-blur" | "gif" | "polygon";
type StartPosition =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export interface ThemeToggleButtonProps {
  theme?: "light" | "dark";
  showLabel?: boolean;
  variant?: AnimationVariant;
  start?: StartPosition;
  url?: string; // For gif variant
  className?: string;
  duration?: number;
  onClick?: () => void;
}
const ThemeToggleButtonWrapper = ({
  theme = "light",
  showLabel = false,
  variant = "circle",
  start = "center",
  url,
  className,
  onClick,
  duration = 400,
}: ThemeToggleButtonProps) => {
  const durationInSeconds = duration / 1000;
  const handleClick = useCallback(() => {
    // Inject animation styles for this specific transition
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement("style");
    style.id = styleId;

    // Generate animation CSS based on variant
    let css = "";
    const positions = {
      center: "center",
      "top-left": "top left",
      "top-right": "top right",
      "bottom-left": "bottom left",
      "bottom-right": "bottom right",
    };

    if (variant === "circle") {
      const cx =
        start === "center" ? "50" : start.includes("left") ? "0" : "100";
      const cy =
        start === "center" ? "50" : start.includes("top") ? "0" : "100";
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { 
            animation: none;
          }
          ::view-transition-new(root) {
            animation: circle-expand ${durationInSeconds}s ease-out;
            transform-origin: ${positions[start]};
          }
          @keyframes circle-expand {
            from {
              clip-path: circle(0% at ${cx}% ${cy}%);
            }
            to {
              clip-path: circle(150% at ${cx}% ${cy}%);
            }
          }
        }
      `;
    } else if (variant === "circle-blur") {
      const cx =
        start === "center" ? "50" : start.includes("left") ? "0" : "100";
      const cy =
        start === "center" ? "50" : start.includes("top") ? "0" : "100";
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) { 
            animation: none;
          }
          ::view-transition-new(root) {
            animation: circle-blur-expand ${durationInSeconds}s ease-out;
            transform-origin: ${positions[start]};
            filter: blur(0);
          }
          @keyframes circle-blur-expand {
            from {
              clip-path: circle(0% at ${cx}% ${cy}%);
              filter: blur(4px);
            }
            to {
              clip-path: circle(150% at ${cx}% ${cy}%);
              filter: blur(0);
            }
          }
        }
      `;
    } else if (variant === "gif" && url) {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) {
            animation: fade-out ${durationInSeconds}s ease-out;
          }
          ::view-transition-new(root) {
            animation: gif-reveal 2.5s cubic-bezier(0.4, 0, 0.2, 1);
            mask-image: url('${url}');
            mask-size: 0%;
            mask-repeat: no-repeat;
            mask-position: center;
          }
          @keyframes fade-out {
            to {
              opacity: 0;
            }
          }
          @keyframes gif-reveal {
            0% {
              mask-size: 0%;
            }
            20% {
              mask-size: 35%;
            }
            60% {
              mask-size: 35%;
            }
            100% {
              mask-size: 300%;
            }
          }
        }
      `;
    } else if (variant === "polygon") {
      css = `
        @supports (view-transition-name: root) {
          ::view-transition-old(root) {
            animation: none;
          }
          ::view-transition-new(root) {
            animation: ${
              theme === "light" ? "wipe-in-dark" : "wipe-in-light"
            } ${duration}s ease-out;
          }
          @keyframes wipe-in-dark {
            from {
              clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
            }
            to {
              clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            }
          }
          @keyframes wipe-in-light {
            from {
              clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
            }
            to {
              clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
            }
          }
        }
      `;
    }

    if (css) {
      style.textContent = css;
      document.head.appendChild(style);

      // Clean up animation styles after transition
      setTimeout(() => {
        const styleEl = document.getElementById(styleId);
        if (styleEl) {
          styleEl.remove();
        }
      }, 3000);
    }

    // Call the onClick handler if provided
    onClick?.();
  }, [onClick, variant, start, url, theme]);
  return (
    <Button
      variant="outline"
      size={showLabel ? "default" : "icon"}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden transition-all",
        showLabel && "gap-2",
        className
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? (
        <Sun className="w-[1.2rem] h-[1.2rem]" />
      ) : (
        <Moon className="w-[1.2rem] h-[1.2rem]" />
      )}
      {showLabel && (
        <span className="text-sm">{theme === "light" ? "Light" : "Dark"}</span>
      )}
    </Button>
  );
};
// Export a helper hook for using with View Transitions API
const useThemeTransition = () => {
  const startTransition = useCallback((updateFn: () => void) => {
    if ("startViewTransition" in document) {
      (document as any).startViewTransition(updateFn);
    } else {
      updateFn();
    }
  }, []);
  return { startTransition };
};

export default function ThemeToggleButton({
  showLabel = false,
  variant = "circle",
  start = "center",
  url,
  className,
  onClick,
  duration = 400,
}: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleToggle = () => {
    if (onClick) {
      onClick();
    } else {
      const newTheme = theme === "light" ? "dark" : "light";
      startTransition(() => {
        setTheme(newTheme);
      });
    }
  };

  // Don't return null, instead render a skeleton or default state
  // This prevents hydration mismatches and layout shifts
  return (
    <ThemeToggleButtonWrapper
      theme={isMounted ? (theme as "light" | "dark") : "light"}
      onClick={isMounted ? handleToggle : undefined}
      showLabel={showLabel}
      variant={variant}
      start={start}
      url={url}
      className={className}
      duration={duration}
    />
  );
}

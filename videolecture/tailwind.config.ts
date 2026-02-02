import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ensure white and black are available
        white: "#ffffff",
        black: "#000000",
        
        // Background colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Surface colors (cards, panels)
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        
        // Text colors
        text: {
          1: "hsl(var(--text-1))",
          2: "hsl(var(--text-2))",
          3: "hsl(var(--text-3))",
        },
        
        // Border colors
        border: {
          DEFAULT: "hsl(var(--border))",
          2: "hsl(var(--border-2))",
        },
        
        // Primary brand color
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "#ffffff",
          100: "hsl(var(--primary-100))",
          600: "hsl(var(--primary-600))",
        },
        
        // Feedback colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "#ffffff",
        },
        
        // Muted
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        // Accent
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Card
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Input
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      
      borderRadius: {
        sm: "8px",
        DEFAULT: "12px",
        md: "14px",
        lg: "16px",
        xl: "18px",
        "2xl": "22px",
        "3xl": "26px",
        "4xl": "28px",
        pill: "999px",
      },
      
      boxShadow: {
        "soft-1": "0 6px 18px rgba(21, 25, 35, 0.08)",
        "soft-2": "0 10px 30px rgba(21, 25, 35, 0.10)",
        "soft-3": "0 18px 50px rgba(21, 25, 35, 0.14)",
        "card": "0 14px 28px rgba(21, 25, 35, 0.06)",
        "card-hover": "0 14px 40px rgba(21, 25, 35, 0.10)",
        "primary": "0 16px 34px rgba(47, 111, 237, 0.24)",
        "primary-hover": "0 16px 34px rgba(47, 111, 237, 0.35)",
      },
      
      fontFamily: {
        sans: ["Poppins", "Roboto", "system-ui", "sans-serif"],
      },
      
      fontSize: {
        "display": ["40px", { lineHeight: "48px", fontWeight: "700" }],
        "h1": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "h2": ["22px", { lineHeight: "30px", fontWeight: "600" }],
        "h3": ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "overline": ["11px", { lineHeight: "16px", fontWeight: "700", letterSpacing: "0.3px" }],
      },
      
      spacing: {
        "4.5": "18px",
        "13": "52px",
        "15": "60px",
        "18": "72px",
        "22": "88px",
      },
      
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
      },
      
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

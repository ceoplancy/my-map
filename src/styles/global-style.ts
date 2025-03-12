import reset from "styled-reset"
import { createGlobalStyle } from "styled-components"

export const COLORS = {
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
  green: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },
  purple: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },
  text: {
    primary: "#111827",
    secondary: "#374151",
    light: "#6B7280",
  },
  background: {
    white: "#FFFFFF",
    light: "#F8FAFC",
    lighter: "#F1F5F9",
  },
  white: "#FFFFFF",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
} as const

const GlobalStyle = createGlobalStyle`
  ${reset}

  :root {
    --transition-base: 0.2s ease-in-out;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
  }

  @media (max-width: 450px) {
    html {
      font-size: 14px;
    }
  }

  body {
    font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
    line-height: 1.5;
    letter-spacing: -0.025em;
    color: ${COLORS.text.primary};
    background-color: ${COLORS.background.light};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    // android 환경 클릭 시 highlight 제거
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  html[data-theme="dark"] {
    background-color: ${COLORS.gray[900]};
    color: ${COLORS.gray[100]};

    body {
      background-color: ${COLORS.gray[900]};
      color: ${COLORS.gray[100]};
    }
  }

  html[data-theme="light"] {
    background-color: ${COLORS.background.light};
    color: ${COLORS.text.primary};
  }

  button {
    font-size: 14px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
    transition: var(--transition-base);

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  a {
    font-size: 14px;
    color: inherit;
    text-decoration: none;
    transition: var(--transition-base);
  }

  input, textarea {
    font-family: inherit;
    border: 1px solid ${COLORS.gray[200]};
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    transition: var(--transition-base);

    &:focus {
      outline: none;
      border-color: ${COLORS.blue[500]};
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
      color: ${COLORS.gray[400]};
    }
  }

  // 스크롤바 스타일링
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${COLORS.gray[100]};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: ${COLORS.gray[300]};
    border-radius: 4px;

    &:hover {
      background: ${COLORS.gray[400]};
    }
  }

  // 텍스트 선택 스타일
  ::selection {
    background: ${COLORS.blue[500]};
    color: white;
  }
`

export default GlobalStyle

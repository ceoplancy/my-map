import reset from "styled-reset"
import { createGlobalStyle } from "styled-components"

const GlobalStyle = createGlobalStyle`
  ${reset}

  html, body {
    /* overflow-y: hidden; */
  }

  @media (min-width: 1201px) {
    html {
      font-size: 10px;
    }
  }

  @media screen and (max-width: 1200px) {
    html {
      font-size: 0.833vw;
    }
  }

  @media (max-width: 450px) {
    html {
      font-size: 1.5vw;
    }
  }

  html[data-theme="dark"] {
    background-color: #000;
    color: #fff;
  }

  html[data-theme="light"] {
    background-color: #fff;
    color: #000;
  }

  body {
    font-family: 'Gothic A1', sans-serif;

    // android 환경 클릭 시 highlight 제거
    outline: none;
    -webkit-tap-highlight-color: rgba(0,0,0,0);
  }

  nav, section, main, footer, div {
    box-sizing: border-box;
  }

  a {
    color: inherit;
    /* text-decoration: none; */
  }

  input, textarea {
    -moz-user-select: auto;
    -webkit-user-select: auto;
    -ms-user-select: auto;
    user-select: auto;
  }
`

export default GlobalStyle

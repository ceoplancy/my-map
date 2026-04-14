// .lintstagedrc.mjs
// See https://nextjs.org/docs/basic-features/eslint#lint-staged for details

import path from "path"

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(" --file ")}`

/** pre-commit: `next build`는 lint-staged가 파일을 여러 청크로 나누면 병렬로 두 번 돌아 .next 충돌이 날 수 있어 제외. CI·로컬에서 `npm run build`로 확인. */
const config = {
  "*.{js,jsx,ts,tsx}": [buildEslintCommand],
}

export default config

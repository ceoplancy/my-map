// .lintstagedrc.mjs
// See https://nextjs.org/docs/basic-features/eslint#lint-staged for details

import path from "path"

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(" --file ")}`

const buildCommand = () => `next build`

/** pre-commit: 타입 생성은 Supabase 프로젝트 상태에 의존하므로 제외. 필요 시 `pnpm typegen` 실행 */
const config = {
  "*.{js,jsx,ts,tsx}": [buildEslintCommand, buildCommand],
}

export default config

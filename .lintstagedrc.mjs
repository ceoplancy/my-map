// .lintstagedrc.mjs
// See https://nextjs.org/docs/basic-features/eslint#lint-staged for details

import path from "path"

const buildEslintCommand = (filenames) =>
  `next lint --fix --file ${filenames
    .map((f) => path.relative(process.cwd(), f))
    .join(" --file ")}`

const buildCommand = () => `next build`
const typegenCommand = () =>
  `supabase gen types typescript --project-id dovcidsnxtvxwlbquvin --schema public > ./src/types/db.ts`

const config = {
  "*.{js,jsx,ts,tsx}": [typegenCommand, buildEslintCommand, buildCommand],
}

export default config

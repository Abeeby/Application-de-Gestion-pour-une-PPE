// Configuration ESLint "flat config" (format attendu par ESLint 9 et Next 16).
//
// L'ancienne version passait par FlatCompat (@eslint/eslintrc), un pont vers
// l'ancien format .eslintrc. Avec eslint-config-next 16, qui exporte deja des
// configs au nouveau format, ce pont plantait ("Converting circular structure
// to JSON") : `npm run lint` ne fonctionnait plus du tout.
// On importe donc directement les configs Next, comme le recommande la doc
// (node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig

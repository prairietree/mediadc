import { recommended } from '@nextcloud/eslint-config'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    name: 'mediadc/base',
    files: ['src/**/*.{js,vue}'],
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
  ...recommended,
])

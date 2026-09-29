import shared from '../../eslint.config.shared.mjs'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default [
  ...shared,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    plugins: {
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactRefresh.configs.vite.rules
    }
  },
  {
    ignores: ['dist/**']
  }
]

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const ENGINE_FORBIDDEN = {
  patterns: [
    { group: ['react', 'react-dom', 'react/*'], message: 'Engine layers must not depend on React.' },
    { group: ['@tanstack/*'], message: 'Engine layers must not depend on TanStack (stores live in src/stores).' },
    { group: ['@/stores', '@/stores/*', '@/ui', '@/ui/*', '@/routes/*', '@/persistence/*'], message: 'Dependencies only point downwards: ui → stores → game → content → core.' },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/routeTree.gen.ts', 'sim-output', 'scripts/assets'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.tsx', 'src/ui/**/*.ts'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['src/core/**', 'src/game/**', 'src/content/**'],
    rules: { 'no-restricted-imports': ['error', ENGINE_FORBIDDEN] },
  },
);

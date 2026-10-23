// Managed by ai-dev-framework (profile react-ts-vite): do not edit – override rules in eslint.config.mjs.
// Usage (eslint.config.mjs):
//   import { frameworkConfig } from './eslint.base.mjs';
//   export default [...frameworkConfig({ tsconfigRootDir: import.meta.dirname }), { /* project overrides */ }];
// Needs: eslint (>= 9.24 for bulk suppressions), @eslint/js, typescript-eslint, eslint-plugin-react-hooks.
// Rules and limits: docs/CODING-GUIDELINES.md §3, docs/principles/03-maintainability.md, 06-enforcement.md.
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

/**
 * @param {object} o
 * @param {string} o.tsconfigRootDir  usually import.meta.dirname
 * @param {string[]} [o.ignores]      extra ignore globs
 * @param {string} [o.webFiles]       glob of the React code
 * @param {{ sharedGlob?: string, webGlob?: string, serverGlob?: string }} [o.layers] globs for the boundary rules
 */
export function frameworkConfig({
  tsconfigRootDir,
  ignores = [],
  webFiles = 'web/src/**/*.{ts,tsx}',
  layers = { sharedGlob: 'shared/src/**/*.ts', webGlob: 'web/src/**/*.{ts,tsx}', serverGlob: 'server/src/**/*.ts' },
}) {
  return defineConfig(
    { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**', 'test-results/**', 'playwright-report/**', '.ai/**', ...ignores] },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: {
        // a promise nobody awaits is a lost error or a race; `void f()` marks a deliberate detach
        '@typescript-eslint/no-floating-promises': ['error', { allowForKnownSafeCalls: [{ from: 'package', package: 'node:test', name: ['test', 'it', 'describe', 'before', 'after', 'beforeEach', 'afterEach'] }] }],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
        '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true }],
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-restricted-syntax': ['error', { selector: 'TSEnumDeclaration[const=false]', message: 'Use a union of string literals instead of an enum.' }],
        // size and shape (principles 03); existing violations go into eslint-suppressions.json (ratchet)
        'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
        'max-params': ['error', 5],
        'max-depth': ['error', 4],
        complexity: ['error', 15],
      },
    },
    {
      // tests are long by nature: describe blocks hold many cases
      files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
      rules: { 'max-lines': 'off', 'max-lines-per-function': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
    },
    {
      // plain .mjs/.cjs scripts are not part of a TypeScript project
      files: ['**/*.mjs', '**/*.cjs'],
      languageOptions: { parserOptions: { projectService: false } },
      rules: { '@typescript-eslint/no-floating-promises': 'off' },
    },
    {
      files: [webFiles],
      plugins: { 'react-hooks': reactHooks },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        // components: the 80-line function limit is too tight for JSX; use 250 and ask for subcomponents
        'max-lines-per-function': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      },
    },
    // layer boundaries (principles 01): shared imports nothing from the apps, web and server do not import each other
    boundary(layers.sharedGlob, ['**/web/**', '**/server/**'], 'shared/ must not import from web/ or server/'),
    boundary(layers.webGlob, ['**/server/**'], 'web/ must not import from server/ (put shared code in shared/)'),
    boundary(layers.serverGlob, ['**/web/**'], 'server/ must not import from web/ (put shared code in shared/)'),
  );
}

function boundary(files, group, message) {
  return files ? { files: [files], rules: { 'no-restricted-imports': ['error', { patterns: [{ group, message }] }] } } : {};
}

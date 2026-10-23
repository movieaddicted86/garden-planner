// Project ESLint config: the framework rules live in eslint.base.mjs (managed); add project overrides below.
// Existing violations of the size/complexity gates: `npx eslint . --suppress-all` writes eslint-suppressions.json;
// `npx eslint . --prune-suppressions` shrinks it as code is cleaned up. New violations fail CI.
import { frameworkConfig } from './eslint.base.mjs';

export default [
  ...frameworkConfig({
    tsconfigRootDir: import.meta.dirname,
    // ignores: ['library/**', 'samples/**'],
    // layers: { sharedGlob: 'shared/src/**/*.ts', webGlob: 'web/src/**/*.{ts,tsx}', serverGlob: 'server/src/**/*.ts' },
  }),
  // project-specific overrides go here
];

import { next } from '@mundomotos/eslint-config/next';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // Vendored from the `anatomy` skill's kit and kept byte-for-byte, so it can be refreshed from
  // upstream without replaying local fixes. Our own code under `shared/iso` is still linted.
  {
    ignores: [
      'src/shared/iso/iso-kit.ts',
      'src/shared/iso/react/draw.tsx',
      'src/shared/iso/react/live.tsx',
    ],
  },
  next,
);

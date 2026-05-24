import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';

type RollupOutputOptions = {
  inlineDynamicImports?: boolean;
  sourcemapFileNames?: string;
};

const stripDeprecatedRollupOutput = (
  output: RollupOutputOptions | RollupOutputOptions[] | undefined
): void => {
  if (!output) return;
  const items = Array.isArray(output) ? output : [output];
  for (const item of items) {
    delete item.inlineDynamicImports;
    delete item.sourcemapFileNames;
  }
};

/**
 * @devvit/start sets rollup options Vite 8 / Rolldown no longer accepts.
 * Strip them here until the Devvit plugin is updated.
 */
function fixDevvitVite8RollupOptions(): Plugin {
  return {
    name: 'modscribe-fix-devvit-vite8-rollup',
    enforce: 'post',
    config(config) {
      const patchEnvironment = (name: 'client' | 'server') => {
        const env = config.environments?.[name];
        if (!env?.build) return;

        if (name === 'server') {
          // Vite 8 runtime option; typings may lag @devvit/start
          Object.assign(env.build, { codeSplitting: false });
        }

        stripDeprecatedRollupOutput(
          env.build.rollupOptions?.output as RollupOutputOptions | RollupOutputOptions[]
        );
        const rolldown = env.build.rolldownOptions as {
          output?: RollupOutputOptions | RollupOutputOptions[];
        };
        stripDeprecatedRollupOutput(rolldown?.output);
      };

      patchEnvironment('client');
      patchEnvironment('server');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), devvit(), fixDevvitVite8RollupOptions()],
});

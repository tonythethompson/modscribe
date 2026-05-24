import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { devvit } from '@devvit/start/vite';

type RollupOutputOptions = {
  inlineDynamicImports?: boolean;
};

/**
 * @devvit/start still sets rollup `inlineDynamicImports` on the server bundle.
 * Vite 8 wants `build.codeSplitting: false` instead — strip the deprecated flag here
 * until the Devvit plugin is updated.
 */
function fixDevvitServerCodeSplitting(): Plugin {
  return {
    name: 'modscribe-fix-devvit-server-code-splitting',
    enforce: 'post',
    config(config) {
      const server = config.environments?.server;
      if (!server?.build) return;

      // Vite 8 runtime option; typings may lag @devvit/start
      Object.assign(server.build, { codeSplitting: false });

      const stripDeprecated = (output: RollupOutputOptions | RollupOutputOptions[] | undefined) => {
        if (!output) return;
        const items = Array.isArray(output) ? output : [output];
        for (const item of items) {
          delete item.inlineDynamicImports;
        }
      };

      stripDeprecated(server.build.rollupOptions?.output as RollupOutputOptions | RollupOutputOptions[]);
      const rolldown = server.build.rolldownOptions as { output?: RollupOutputOptions | RollupOutputOptions[] };
      stripDeprecated(rolldown?.output);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwind(), devvit(), fixDevvitServerCodeSplitting()],
});

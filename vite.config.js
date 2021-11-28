import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return {};
  } else {
    // command === 'build'
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/main.ts'),
          name: 'Just-validate',
          fileName: (format) => `just-validate.${format}.js`,
        },
        rollupOptions: {},
      },
    };
  }
});

import esbuild from 'rollup-plugin-esbuild';
import dts from 'rollup-plugin-dts';

const entries = ['./src/index.ts'];

const plugins = [
  esbuild({
    minify: true,
    target: 'node14',
  }),
];

export default [
  ...entries.map((input) => ({
    input,
    output: [
      {
        file: input.replace('src/', 'dist/').replace('.ts', '-esm.js'),
        format: 'esm',
      },
      {
        file: input.replace('src/', 'dist/').replace('.ts', '-cjs.js'),
        format: 'cjs',
      },
      {
        file: input.replace('src/', 'dist/').replace('.ts', '.js'),
        name: 'unsubber',
        format: 'umd',
        globals: {
          '@inottn/fp-utils': 'fpUtils',
          mitt: 'mitt',
        },
      },
    ],
    plugins,
    external: ['@inottn/fp-utils', 'mitt'],
  })),
  ...entries.map((input) => ({
    input,
    output: {
      file: input.replace('src/', '').replace('.ts', '.d.ts'),
      format: 'esm',
    },
    plugins: [dts()],
  })),
];

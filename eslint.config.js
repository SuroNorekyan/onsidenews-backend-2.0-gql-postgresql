import eslintPluginPrettier from 'eslint-plugin-prettier';
import prettierConfig from './.prettierrc';

export default [
  {
    files: ['**/*.ts'],
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': ['error', { ...prettierConfig }],
    },
  },
];


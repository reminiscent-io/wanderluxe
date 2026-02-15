import esbuild from 'esbuild';

esbuild.buildSync({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/server/index.js',
  target: 'node18',
  banner: {
    js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
  },
  external: [
    'dotenv',
    'express',
    'cors',
    'express-rate-limit',
    '@sendgrid/mail',
    '@supabase/supabase-js',
    'stripe',
    'puppeteer',
    'pdfmake',
    'handlebars',
  ],
});

console.log('Server build complete: dist/server/index.js');

import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync(new URL('../source/public/',import.meta.url),{recursive:true});
copyFileSync(new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url),new URL('../source/public/pdf.worker.min.mjs',import.meta.url));

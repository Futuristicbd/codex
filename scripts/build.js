import { access, mkdir, cp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = ['index.html', 'src/main.js', 'src/styles.css'];
await Promise.all(required.map((file) => access(file, constants.R_OK)));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src/main.js', 'dist/src/main.js');
await cp('src/styles.css', 'dist/src/styles.css');
console.log('Static landing page built in dist/.');

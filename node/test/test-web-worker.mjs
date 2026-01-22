import { markdownToStandaloneHtml } from './dist/index.js';
import * as fs from 'fs';

const md = fs.readFileSync('./test/fixtures/full.md', 'utf8');
const html = await markdownToStandaloneHtml(md, {
  title: 'Full Test',
  theme: 'default',
  liveDiagrams: true
});
fs.writeFileSync('./out/test-web-worker.html', html);
console.log('Saved to test-web-worker.html');

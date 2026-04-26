import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const browser = process.argv[2] === 'firefox' ? 'firefox-mv3' : 'chrome-mv3';
const outputDir = join('.output', browser);

await build({
  entryPoints: {
    content: 'src/content/index.ts',
    background: 'src/background/index.ts',
    popup: 'src/popup/index.ts',
  },
  outdir: 'extension',
  bundle: true,
  format: 'iife',
  target: ['chrome109', 'firefox109'],
  logLevel: 'info',
});

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await cp('extension', outputDir, { recursive: true });

const manifestPath = join(outputDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (browser === 'chrome-mv3') {
  delete manifest.browser_specific_settings;
}

await writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Built ${outputDir}`);

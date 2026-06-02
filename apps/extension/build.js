const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const dist = path.join(__dirname, 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

async function build() {
  await esbuild.build({
    entryPoints: [path.join(src, 'background', 'background.ts')],
    bundle: true,
    outfile: path.join(dist, 'background.js'),
    platform: 'browser',
    sourcemap: false,
  });

  await esbuild.build({
    entryPoints: [path.join(src, 'background', 'content', 'content.ts')],
    bundle: true,
    outfile: path.join(dist, 'content.js'),
    platform: 'browser',
    sourcemap: false,
  });

  await esbuild.build({
    entryPoints: [path.join(src, 'options.ts')],
    bundle: true,
    outfile: path.join(dist, 'options.js'),
    platform: 'browser',
    sourcemap: false,
  });

  // copy options.html and ensure it references options.js
  let optionsHtml = fs.readFileSync(path.join(src, 'options.html'), 'utf8');
  optionsHtml = optionsHtml.replace('options.js', 'options.js');
  fs.writeFileSync(path.join(dist, 'options.html'), optionsHtml);

  // create a dist manifest based on src manifest
  const manifestSrc = JSON.parse(fs.readFileSync(path.join(src, 'manifest.json'), 'utf8'));
  const manifest = Object.assign({}, manifestSrc, {
    background: { service_worker: 'background.js' },
    content_scripts: [{ matches: ['<all_urls>'], js: ['content.js'] }],
    options_ui: { page: 'options.html', open_in_tab: true }
  });
  fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('build complete');
}

build().catch((e) => { console.error(e); process.exit(1); });

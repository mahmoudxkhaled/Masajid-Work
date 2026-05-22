import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist', 'Masajid-Work');
const repo = 'https://github.com/mahmoudxkhaled/Masajid-Work.git';

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Missing dist/Masajid-Work — run: npm run build:gh-pages');
  process.exit(1);
}

fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const gitDir = path.join(dist, '.git');
if (fs.existsSync(gitDir)) {
  fs.rmSync(gitDir, { recursive: true, force: true });
}

execSync('git init', { cwd: dist, stdio: 'inherit' });
execSync('git add -A', { cwd: dist, stdio: 'inherit' });
execSync('git commit -m "deploy: GitHub Pages"', { cwd: dist, stdio: 'inherit' });
execSync('git branch -M gh-pages', { cwd: dist, stdio: 'inherit' });
execSync(`git push -f ${repo} gh-pages`, { cwd: dist, stdio: 'inherit' });

console.log('Deployed to gh-pages branch.');

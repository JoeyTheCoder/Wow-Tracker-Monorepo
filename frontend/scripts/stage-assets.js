const fs = require('node:fs');
const path = require('node:path');

const sourceDirectory = path.resolve(__dirname, '../../assets');
const targetDirectory = path.resolve(__dirname, '../public/assets');

if (!fs.existsSync(sourceDirectory)) {
  throw new Error(`Brand asset directory not found: ${sourceDirectory}`);
}

fs.rmSync(targetDirectory, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDirectory), { recursive: true });
fs.cpSync(sourceDirectory, targetDirectory, { recursive: true });
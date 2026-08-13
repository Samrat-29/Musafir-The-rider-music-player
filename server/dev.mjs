import { spawn } from 'node:child_process';

const presence = spawn(process.execPath, ['server/presence.mjs'], { stdio: 'inherit' });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit' });
const stop = () => { presence.kill(); vite.kill(); process.exit(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
vite.on('exit', code => { presence.kill(); process.exit(code ?? 0); });

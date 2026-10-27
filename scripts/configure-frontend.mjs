import {writeFileSync} from 'node:fs';
const api=(process.env.QFLOW_API_BASE||'').replace(/\/$/,'');
if(api&&!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(api))throw Error('QFLOW_API_BASE must be an HTTPS origin, with no path.');
writeFileSync(new URL('../frontend/src/app/deployment.ts',import.meta.url),`// Public build configuration. Never put secrets here.\nexport const API_BASE = ${JSON.stringify(api)};\n`);

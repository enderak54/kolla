import { createServer } from 'http';
import { RED } from 'node-red';

// Start Node-RED programmatically
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

const nodeExe = process.execPath;
const nrPath = path.join(process.env.APPDATA, 'npm', 'node_modules', 'node-red', 'red.js');

const logFile = path.join(process.env.USERPROFILE, '.node-red', 'nr_test_log.txt');

const child = spawn(nodeExe, [nrPath, '-p', '1885', '-v'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
    stdout += data.toString();
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    stderr += data.toString();
    process.stderr.write(data);
});

child.on('error', (err) => {
    console.error('Failed to start:', err);
    process.exit(1);
});

// Wait for startup
await new Promise(resolve => setTimeout(resolve, 20000));

// Now query the API
import http from 'http';

function httpGet(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:1885${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

try {
    // Get flows
    const flows = await httpGet('/flows');
    console.log(`\n=== Flows: ${flows.length} ===`);
    flows.forEach(f => console.log(`  ${f.type} id=${f.id} group=${f.group || ''}`));

    // Get nodes (palette)
    const nodes = await httpGet('/nodes');
    console.log(`\n=== Palette nodes ===`);
    const dashNodes = nodes.filter(n => n.id && n.id.includes('dashboard'));
    dashNodes.forEach(n => console.log(`  ${n.id} type=${n.type} enabled=${n.enabled}`));

    // Try GET /ui/api to see what's available
    try {
        const uiApi = await httpGet('/ui/api');
        console.log(`\n=== /ui/api: ${typeof uiApi === 'string' ? uiApi.substring(0, 200) : JSON.stringify(uiApi).substring(0, 500)}`);
    } catch {
        console.log('\n/ui/api not available');
    }

} catch (err) {
    console.error('API error:', err.message);
}

child.kill();
process.exit(0);

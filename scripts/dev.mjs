import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';

console.log('🚀 Starting NEXDESK Server & Client concurrently...\n');

function runProcess(name, npmArgs, prefixColor) {
  const binary = isWin ? 'cmd.exe' : 'npm';
  const args = isWin ? ['/d', '/s', '/c', 'npm', ...npmArgs] : npmArgs;

  const proc = spawn(binary, args, {
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  proc.stdout.on('data', (data) => {
    for (const line of data.toString().split('\n')) {
      if (line.trim()) console.log(`${prefixColor}[${name}]\x1b[0m ${line}`);
    }
  });

  proc.stderr.on('data', (data) => {
    for (const line of data.toString().split('\n')) {
      if (line.trim()) console.error(`${prefixColor}[${name}]\x1b[0m ${line}`);
    }
  });

  proc.on('close', (code) => {
    console.log(`${prefixColor}[${name}]\x1b[0m exited with code ${code}`);
  });

  return proc;
}

const server = runProcess('SERVER', ['run', 'dev', '--workspace=server'], '\x1b[36m');
const client = runProcess('CLIENT', ['run', 'dev', '--workspace=client'], '\x1b[32m');

function cleanup() {
  console.log('\n🛑 Stopping dev processes...');
  if (isWin) {
    if (server.pid) spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
    if (client.pid) spawn('taskkill', ['/pid', client.pid.toString(), '/f', '/t']);
  } else {
    server.kill('SIGINT');
    client.kill('SIGINT');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

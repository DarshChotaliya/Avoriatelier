/**
 * Runs the Avori ERP deploy scripts on the VPS from this computer, over SSH.
 *
 *     node deploy/deploy.js check     only look: which ports are in use on the server (changes nothing)
 *     node deploy/deploy.js setup     first time: uploads deploy/setup.sh and runs it (install, clone, build, start)
 *     node deploy/deploy.js update    later: git pull + build + restart on the server
 *
 * The server login is read from deploy/vps.local.json (copy vps.example.json; that file is ignored by Git, so the
 * password is never committed or printed). setup / update use the code that is pushed to GitHub, so push first.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const APP_DIR = '/var/www/avori-erp';
const mode = process.argv[2];
const COMMANDS = {
  // Listening ports with the program that owns each one, then the ports this setup would pick.
  check: [
    'echo "--- ports in use (port / program) ---"',
    "ss -tlnpH | awk '{print $4, $6}' | sed -E 's/.*:([0-9]+) /\\1 /; s/users:\\(\\(\"([^\"]+)\".*/\\1/' | sort -n -u",
    'echo "--- free for the ERP ---"',
    'for p in 5023 5024 5025 8090 8091 8092; do ss -tlnH | awk \'{print $4}\' | grep -qE "[:.]$p\\$" && echo "$p in use" || echo "$p free"; done',
    'echo "--- server ---"; . /etc/os-release; echo "$PRETTY_NAME"; nginx -v 2>&1; psql --version 2>&1; node -v 2>&1; free -m | sed -n 2p',
  ].join('; '),
  update: `bash ${APP_DIR}/deploy/update.sh`,
};

if (!['check', 'setup', 'update'].includes(mode)) {
  console.error('Usage: node deploy/deploy.js check | setup | update');
  process.exit(1);
}

// Login: deploy/vps.local.json when it holds the password; otherwise the password is asked for here (typed hidden,
// kept only in memory). Host, username and domain come from vps.local.json, else from vps.example.json.
const readJson = (name) => {
  const file = path.join(__dirname, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
};
const vps = { ...readJson('vps.example.json'), ...readJson('vps.local.json') };
const hasPassword = (v) => Boolean(v) && !v.startsWith('PUT');

const askPassword = () => new Promise((resolve) => {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(`Password for ${vps.username || 'root'}@${vps.host} (hidden): `);
  // Nothing typed is echoed back.
  rl._writeToOutput = () => {};
  rl.question('', (answer) => {
    rl.close();
    process.stdout.write('\n');
    resolve(answer.trim());
  });
});

const run = (conn, command) => new Promise((resolve, reject) => {
  conn.exec(command, (err, stream) => {
    if (err) return reject(err);
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
    stream.on('close', (code) => resolve(code));
    return undefined;
  });
});

const upload = (conn, local, remote) => new Promise((resolve, reject) => {
  conn.sftp((err, sftp) => {
    if (err) return reject(err);
    return sftp.fastPut(local, remote, {}, (e) => {
      sftp.end();
      return e ? reject(e) : resolve();
    });
  });
});

const conn = new Client();
conn.on('ready', async () => {
  try {
    let code;
    if (mode === 'setup') {
      console.log('Uploading setup.sh…');
      await upload(conn, path.join(__dirname, 'setup.sh'), '/root/avori-erp-setup.sh');
      // A domain is optional; without one the ERP is served on http://<ip>:<free port>.
      // `--local`: no domain site; the ERP answers only on a port of the server itself (used when another
      // Nginx site already owns the domain and will be pointed at the ERP by hand).
      const local = process.argv.includes('--local');
      const domain = !local && /^[a-z0-9.-]+$/i.test(vps.domain || '') ? vps.domain : '';
      code = await run(conn, `DOMAIN='${domain}' LOCAL_ONLY='${local ? 1 : ''}' bash /root/avori-erp-setup.sh`);
    } else {
      code = await run(conn, COMMANDS[mode]);
    }
    console.log(code === 0 ? `\n${mode}: done.` : `\n${mode}: FAILED (exit ${code}).`);
    process.exitCode = code || 0;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    conn.end();
  }
}).on('error', (e) => {
  console.error('SSH:', e.message);
  process.exit(1);
});

(async () => {
  const password = hasPassword(vps.password) ? vps.password : await askPassword();
  if (!password) {
    console.error('No password given.');
    process.exit(1);
  }
  conn.connect({ host: vps.host, port: vps.port || 22, username: vps.username || 'root', password, readyTimeout: 30000 });
})();

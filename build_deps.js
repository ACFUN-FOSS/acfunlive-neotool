import { exec } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function subDirs(dir) {
  const dirs = [];
  for (const path of await readdir(dir)) {
    const p = join(dir, path);
    if ((await stat(p)).isDirectory()) {
      dirs.push(p);
    }
  }

  return dirs;
}

async function asyncExec(cmd) {
  await new Promise((resolve, reject) =>
    exec(cmd, (error, stdout, stderr) => {
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.error(stderr);
      }
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    })
  );
}

async function build(dir) {
  await asyncExec(`pnpm --dir ${dir} build`);
}

for (const dir of await subDirs('./plugins')) {
  await build(dir);
}

for (const dir of await subDirs('./apps')) {
  await build(dir);

  const web = join(dir, 'packages', 'web');
  try {
    if ((await stat(web)).isDirectory()) {
      await build(web);
      await build(web);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

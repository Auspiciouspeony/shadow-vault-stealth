// Take the game's screenshots with headless Chrome (no dependencies): for each
// entry of shots.json, load game/ with its query string and capture 1280x720.
// Usage: node shot.mjs [port] — serve.ts must already be running on that port.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const port = process.argv[2] ?? '8080';
const chrome = process.env.CHROME ?? '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

for (const shot of shots) {
  const out = join(here, 'screenshots', shot.name);
  const url = `http://127.0.0.1:${port}/${shot.query}`;
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--window-size=1280,720',
      '--virtual-time-budget=10000',
      `--screenshot=${out}`,
      url,
    ],
    { stdio: 'inherit', timeout: 60000 },
  );
  const bytes = statSync(out).size;
  console.log(`${shot.name}: ${bytes} bytes`);
  if (bytes > 262144) console.log(`  WARNING: over the 256 KiB cap`);
}

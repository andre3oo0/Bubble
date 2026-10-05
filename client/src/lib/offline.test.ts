import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { HELPLINES } from '@shared/safety';

// public/offline.html is plain HTML (it has to work with nothing else loaded), so
// it repeats the helplines. This keeps it from drifting out of date.
const offlinePage = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/offline.html'),
  'utf-8',
);

describe('offline page', () => {
  it.each(HELPLINES.map((line) => [line.name, line.phone]))('shows %s (%s) with a working call link', (name, phone) => {
    expect(offlinePage).toContain(name);
    expect(offlinePage).toContain(phone);
    expect(offlinePage).toContain(`href="tel:${phone.replace(/\s/g, '')}"`);
  });
});

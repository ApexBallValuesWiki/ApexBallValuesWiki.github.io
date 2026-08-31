import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { processAdminImage } from './adminImage';

// The admin's #1 complaint was "I can't even alter the image of the unit I'm
// editing": an unreadable file threw out of the save, so the whole record was
// refused. These guard the contract every form now shares.

const ROOT = process.cwd();

describe('processAdminImage', () => {
  it('treats "no file picked" as no image, not as an error', async () => {
    expect(await processAdminImage(undefined)).toEqual({ imageUrl: null, error: '' });
    expect(await processAdminImage(null)).toEqual({ imageUrl: null, error: '' });
  });

  it('rejects a non-image before touching the canvas', async () => {
    const { imageUrl, error } = await processAdminImage({ name: 'notes.txt', type: 'text/plain' });
    expect(imageUrl).toBeNull();
    expect(error).toMatch(/not an image/);
  });

  it('reports an encode failure instead of throwing through the save', async () => {
    // No document/canvas in the node test env, so any image *must* come back as
    // a reported error rather than a rejected promise.
    const { imageUrl, error } = await processAdminImage({ name: 'a.png', type: 'image/png' });
    expect(imageUrl).toBeNull();
    expect(typeof error).toBe('string');
  });
});

describe('admin image wiring (source guards)', () => {
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

  it('every create form goes through the shared helper', () => {
    for (const file of [
      'src/components/admin/CreateUnitPage.jsx',
      'src/components/admin/CreateMapForm.jsx',
      'src/components/admin/CreateMaterialForm.jsx',
      'src/components/admin/CreateSkinForm.jsx',
    ]) {
      const src = read(file);
      expect(src, file).toContain('processAdminImage(imageFile)');
      expect(src, file).not.toMatch(/uploadUnitImage\(|uploadContentImage\(/);
    }
  });

  it('the WIKI editor can be edited by URL and undone before saving', () => {
    const src = read('src/components/admin/AdminParts.jsx');
    expect(src).toContain('Drop unit artwork image here');
    expect(src).toContain('Image URL (or paste a link instead of uploading)');
    expect(src).toContain('✖ Discard picked image');
    // the leak: createObjectURL used to run on every render with no revoke
    expect(src).toContain('URL.revokeObjectURL(url)');
    expect(src).not.toMatch(/const previewSrc = imageFile \? URL\.createObjectURL/);
  });

  it('a failing picture never vetoes a save', () => {
    const src = read('src/pages/admin/AdminHome.jsx');
    expect(src).toMatch(/catch \(imageFailure\) \{\s*imageError = errorMessage\(imageFailure\);/);
    expect(src).toContain('but the image was not applied');
  });
});

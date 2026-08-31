// ============================================================================
// APEX UNIT IMAGE PREP
// ----------------------------------------------------------------------------
// Editors pick an image; it is resized/compressed in the browser and stored
// as a compact WebP data URL inside the KV override itself — no storage
// bucket, no upload service, nothing to clean up on delete.
// ============================================================================

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read selected image.'));
    };
    image.src = url;
  });
}

/**
 * Resize + re-encode an image file to a compact WebP File object.
 */
export async function prepareUnitImage(file, maxSize = 1024, quality = 0.84) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file.');
  const image = await loadImageFromFile(file);
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('Could not convert this image to WebP.');
  return new File([blob], `${(file.name || 'unit').replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
}

/**
 * The old chain was encode -> File -> decode -> encode again: a WebP File that
 * `canvas.toBlob` could not produce (or that failed to re-decode) threw inside
 * the save, so the WHOLE record was rejected over its picture. One pass, from
 * the picked file straight to the data URL the entry stores.
 */
export async function uploadContentImage(file, _prefix, _slug, _session) {
  return fileToUnitRenderDataUrl(file, 512);
}

export async function uploadUnitImage(file, _slug, _session) {
  return fileToUnitRenderDataUrl(file, 512);
}

export async function fileToUnitRenderDataUrl(file, size = 512) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, x, y, width, height);

  return canvas.toDataURL('image/webp', 0.9);
}

/**
 * Every admin form used to wrap this call in its own ad-hoc try/catch (or in
 * none at all, which is how one unreadable PNG vetoed an entire unit save).
 * One shared rule instead: a missing file or a non-image is simply "no image";
 * a genuine encode failure is reported in `error` so the UI can say so while
 * the record still saves.
 */
export async function processAdminImage(file, size = 512) {
  if (!file) return { imageUrl: null, error: '' };
  if (!file.type?.startsWith('image/')) {
    return { imageUrl: null, error: 'That file is not an image — choose a PNG, JPEG or WebP.' };
  }
  try {
    return { imageUrl: await fileToUnitRenderDataUrl(file, size), error: '' };
  } catch (e) {
    return { imageUrl: null, error: e?.message || 'Could not read that image.' };
  }
}

/**
 * No-op kept for API compatibility: images live inside the KV override as
 * data URLs, so there is no bucket to clean up when a unit is deleted.
 */
export async function removeUnitImages() {
  // nothing to do — data-URL images are removed with the override itself
}

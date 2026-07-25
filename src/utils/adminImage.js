import { supabase, isSupabaseConfigured } from './supabase';

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
 * Upload a unit render to the public `unit-images` Storage bucket and return
 * its public URL. Falls back to a compact data URL ONLY if the upload fails
 * (so a broken storage policy never leaves the editor with no image), but the
 * happy path stores a lightweight URL in the DB instead of a base64 blob.
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

export async function uploadContentImage(file, prefix, slug, session) {
  const prepared = await prepareUnitImage(file);
  const path = `${prefix}/${slug}.webp`;
  if (isSupabaseConfigured && session) {
    const { error } = await supabase.storage.from('unit-images').upload(path, prepared, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
    if (!error) { const { data } = supabase.storage.from('unit-images').getPublicUrl(path); if (data?.publicUrl) return data.publicUrl; }
  }
  return fileToUnitRenderDataUrl(prepared, 512);
}

export async function uploadUnitImage(file, slug, session) {
  const prepared = await prepareUnitImage(file);
  const path = `${slug}.webp`;

  if (isSupabaseConfigured && session) {
    const { error } = await supabase.storage
      .from('unit-images')
      .upload(path, prepared, { upsert: true, contentType: 'image/webp', cacheControl: '31536000' });
    if (!error) {
      const { data } = supabase.storage.from('unit-images').getPublicUrl(path);
      if (data?.publicUrl) return data.publicUrl;
    }
    console.warn('Unit image upload fell back to data URL:', error?.message);
  }

  return fileToUnitRenderDataUrl(prepared, 512);
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

/** Remove any bucket objects that might exist for a slug (best-effort). */
export async function removeUnitImages(slug) {
  const exts = ['webp', 'png', 'jpg', 'jpeg'];
  await supabase.storage.from('unit-images').remove(exts.map((e) => `${slug}.${e}`)).catch(() => {});
}

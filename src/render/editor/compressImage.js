// Downscales and re-encodes pasted images before they are embedded as data URLs, since every
// byte is stored in the page's Markdown and re-encrypted on each save. Re-encoding also drops
// EXIF metadata such as GPS location.

const MAX_DIMENSION = 2560;
const QUALITY = 0.85;
// GIFs would lose their animation and SVGs their scalability.
const COMPRESSIBLE_TYPE = /^image\/(png|jpeg|webp|bmp)$/;

export async function compressImage(file) {
  if (!COMPRESSIBLE_TYPE.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // JPEG has no transparency to preserve; WebP keeps it for PNGs. Browsers that cannot
    // encode WebP return PNG instead, which the size check below usually rejects.
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
}

export const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

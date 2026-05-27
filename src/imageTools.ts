const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.84;
const DIRECT_READ_LIMIT = 550_000;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not optimize this image.'));
    reader.readAsDataURL(blob);
  });

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load this image.'));
    };

    image.src = objectUrl;
  });

export const imageFileToOptimizedDataUrl = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file.');
  }

  if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size <= DIRECT_READ_LIMIT) {
    return readFileAsDataUrl(file);
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available in this browser.');

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Could not optimize this image.'));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    });

    return blobToDataUrl(blob);
  } catch {
    return readFileAsDataUrl(file);
  }
};

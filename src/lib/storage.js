import { supabase } from './supabase';

const PHOTOS_BUCKET = import.meta.env.VITE_SUPABASE_PHOTOS_BUCKET || 'cargo-photos';
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const FIRESTORE_FALLBACK_MAX_BYTES = 700 * 1024;
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const textBytes = (value) => new TextEncoder().encode(value).length;

const safeFilename = (name) =>
  (name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

const makePhotoPath = (folder, orderId, fileName) => {
  if (!orderId) {
    throw new Error('Order ID is required before uploading proof photos.');
  }
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${folder}/${orderId}/${timestamp}_${rand}_${safeFilename(fileName)}.jpg`;
};

const validatePhotoFile = (file) => {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }
};

export const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Image compression timed out')), 30000);

    const reader = new FileReader();
    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to read image file'));
    };
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      img.onload = () => {
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout);
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to encode image fallback'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

const compressForFirestoreFallback = async (file) => {
  const attempts = [
    { maxWidth: 800, quality: 0.55 },
    { maxWidth: 640, quality: 0.45 },
    { maxWidth: 480, quality: 0.38 },
  ];

  let last;
  for (const attempt of attempts) {
    const blob = await compressImage(file, attempt.maxWidth, attempt.quality);
    const dataUrl = await blobToDataUrl(blob);
    last = { blob, dataUrl };
    if (textBytes(dataUrl) <= FIRESTORE_FALLBACK_MAX_BYTES) return last;
  }

  throw new Error(
    `Compressed fallback is still too large for Firestore (${Math.ceil(textBytes(last.dataUrl) / 1024)}KB).`
  );
};

const uploadToSupabaseStorage = async (file, folder, orderId) => {
  const compressed = await compressImage(file);
  const path = makePhotoPath(folder, orderId, file.name);

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });

  if (error) throw error;

  return {
    type: 'supabase_storage',
    bucket: PHOTOS_BUCKET,
    path,
    order_id: orderId,
    content_type: 'image/jpeg',
    size_bytes: compressed.size,
    created_at: new Date().toISOString(),
  };
};

const uploadToFirestoreFallback = async (file, folder, orderId) => {
  const { blob, dataUrl } = await compressForFirestoreFallback(file);

  const { data, error } = await supabase.functions.invoke('store-photo-fallback', {
    body: {
      order_id: orderId,
      folder,
      file_name: safeFilename(file.name),
      content_type: 'image/jpeg',
      size_bytes: blob.size,
      data_url: dataUrl,
    },
  });

  if (error) throw new Error(error.message || 'Firestore fallback upload failed');
  if (data?.error) throw new Error(data.error);

  return {
    type: 'firebase_base64',
    firestore_path: data.firestore_path,
    order_id: orderId,
    content_type: 'image/jpeg',
    size_bytes: blob.size,
    created_at: data.created_at || new Date().toISOString(),
  };
};

export const uploadPhoto = async (file, folder = 'pickup', orderId = '') => {
  validatePhotoFile(file);

  try {
    return await uploadToSupabaseStorage(file, folder, orderId);
  } catch (storageError) {
    try {
      return await uploadToFirestoreFallback(file, folder, orderId);
    } catch (fallbackError) {
      throw new Error(
        `Photo upload failed. Supabase Storage: ${storageError.message}. Firestore fallback: ${fallbackError.message}`
      );
    }
  }
};

export const uploadMultiplePhotos = async (files, folder = 'pickup', orderId = '', onProgress = null) => {
  const photos = [];
  for (let i = 0; i < files.length; i += 1) {
    const photo = await uploadPhoto(files[i], folder, orderId);
    photos.push(photo);
    if (onProgress) onProgress(i + 1, files.length);
  }
  return photos;
};

export const resolvePhotoUrl = async (photo) => {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;

  if (photo.type === 'supabase_storage' && photo.path) {
    if (photo.url) return photo.url;
    const { data, error } = await supabase.storage
      .from(photo.bucket || PHOTOS_BUCKET)
      .createSignedUrl(photo.path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  }

  if (photo.type === 'firebase_base64' && photo.firestore_path) {
    const { data, error } = await supabase.functions.invoke('get-photo-fallback', {
      body: {
        firestore_path: photo.firestore_path,
        order_id: photo.order_id,
      },
    });
    if (error) throw new Error(error.message || 'Failed to load Firestore fallback photo');
    if (data?.error) throw new Error(data.error);
    return data.data_url || '';
  }

  return photo.url || photo.data_url || '';
};

export const resolvePhotoUrls = async (photos = []) => {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const resolved = await Promise.allSettled(photos.map(resolvePhotoUrl));
  return resolved
    .filter(result => result.status === 'fulfilled' && result.value)
    .map(result => result.value);
};

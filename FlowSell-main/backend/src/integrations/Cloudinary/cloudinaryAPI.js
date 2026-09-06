import { randomUUID } from 'node:crypto';
import { cloudinaryConfig } from '../../config/cloudinary-config.js';

const UPLOAD_TIMEOUT_MS = 45_000;
const DELETE_TIMEOUT_MS = 30_000;
const MAX_DELETE_BATCH = 100;

const extensionsByMimeType = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

const readCloudinaryPayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
  return { error: { message: await response.text() } };
};

const requestCloudinary = async (url, options, operation) => {
  try {
    return await fetch(url, options);
  } catch (cause) {
    const error = new Error(`No se pudo conectar con Cloudinary para ${operation}.`);
    error.status = 502;
    error.cause = cause;
    throw error;
  }
};

const createCloudinaryError = (operation, response, payload) => {
  const providerMessage = payload?.error?.message || payload?.message;
  const error = new Error(
    providerMessage
      ? `Cloudinary no pudo ${operation}: ${providerMessage}`
      : `Cloudinary no pudo ${operation} (HTTP ${response.status}).`,
  );
  error.status = 502;
  return error;
};

const uploadImage = async (file, userId) => {
  const extension = extensionsByMimeType[file?.mimetype];
  if (!extension || !file?.buffer) {
    const error = new Error('Formato de imagen no permitido.');
    error.status = 400;
    throw error;
  }

  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), `attachment.${extension}`);
  form.append('public_id', `${cloudinaryConfig.folder}/${String(userId)}/${randomUUID()}`);
  form.append('overwrite', 'false');
  form.append('unique_filename', 'false');
  form.append('allowed_formats', 'jpg,png,webp');

  const response = await requestCloudinary(`${cloudinaryConfig.apiBaseUrl}/image/upload`, {
    method: 'POST',
    headers: { Authorization: cloudinaryConfig.authorization },
    body: form,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  }, 'subir la imagen');
  const payload = await readCloudinaryPayload(response);

  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw createCloudinaryError('subir la imagen', response, payload);
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
  };
};

export const extractCloudinaryPublicId = (imageUrl) => {
  if (typeof imageUrl !== 'string' || !imageUrl) return null;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') return null;

    const pathSegments = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map(segment => decodeURIComponent(segment));

    if (pathSegments[0] !== cloudinaryConfig.cloudName) return null;
    if (pathSegments[1] !== 'image' || pathSegments[2] !== 'upload') return null;

    let assetSegments = pathSegments.slice(3);
    const versionIndex = assetSegments.findIndex(segment => /^v\d+$/.test(segment));
    if (versionIndex >= 0) assetSegments = assetSegments.slice(versionIndex + 1);
    if (!assetSegments.length) return null;

    const lastIndex = assetSegments.length - 1;
    assetSegments[lastIndex] = assetSegments[lastIndex].replace(/\.[a-zA-Z0-9]+$/, '');

    return assetSegments.every(Boolean) ? assetSegments.join('/') : null;
  } catch {
    return null;
  }
};

const deletePublicIds = async (publicIds) => {
  const query = new URLSearchParams({ invalidate: 'true' });
  publicIds.forEach(publicId => query.append('public_ids[]', publicId));

  const response = await requestCloudinary(
    `${cloudinaryConfig.apiBaseUrl}/resources/image/upload?${query.toString()}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: cloudinaryConfig.authorization,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
    },
    'eliminar las imágenes',
  );
  const payload = await readCloudinaryPayload(response);

  if (!response.ok) throw createCloudinaryError('eliminar las imágenes', response, payload);
  return payload;
};

export const deleteTemplateImages = async (imageUrls = []) => {
  const publicIds = [...new Set(
    (Array.isArray(imageUrls) ? imageUrls : [])
      .map(extractCloudinaryPublicId)
      .filter(Boolean),
  )];

  const results = [];
  for (let index = 0; index < publicIds.length; index += MAX_DELETE_BATCH) {
    results.push(await deletePublicIds(publicIds.slice(index, index + MAX_DELETE_BATCH)));
  }
  return results;
};

export const uploadTemplateImages = async (files, userId) => {
  const imageFiles = files?.['images-posventa'] || [];
  const uploaded = [];

  try {
    for (const file of imageFiles) uploaded.push(await uploadImage(file, userId));
    return uploaded.map(asset => asset.url);
  } catch (error) {
    if (uploaded.length) {
      await deleteTemplateImages(uploaded.map(asset => asset.url)).catch(cleanupError => {
        console.warn('No se pudo revertir una carga parcial de Cloudinary:', cleanupError.message);
      });
    }
    throw error;
  }
};

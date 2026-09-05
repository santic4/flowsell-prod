import { bucket } from "../../config/firebase-config.js";
import { randomUUID } from 'node:crypto';

export const imageUploadFBService = async (files, userId) => {
  try {
    const imageFiles = files['images-posventa'] || [];

    const imageUrls = [];

    // Subir imágenes a Firebase Storage
    for (const file of imageFiles) {
      const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const extension = extensions[file.mimetype];
      if (!extension) throw new Error('Formato de imagen no permitido.');
      const fileUpload = bucket.file(`flowsell1/${String(userId)}/${randomUUID()}.${extension}`);
      await fileUpload.save(file.buffer, { contentType: file.mimetype });
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileUpload.name)}?alt=media`;
      imageUrls.push(imageUrl);
    }

    return imageUrls;

  } catch (error) {
    throw error;
  }
};

export const imageDeleteFBService = async (toDelete) => {
  try {
    const deleted = await Promise.all(toDelete.map(async url => {
     const match = url.match(/\/o\/(.+)\?alt=media/);
     if (match?.[1]) {
       const filePath = decodeURIComponent(match[1]);
       try {
         await bucket.file(filePath).delete();
         console.log(`🗑️ Borrado de Firebase: ${filePath}`);
       } catch (e) {
         console.warn(`No se pudo borrar ${filePath}:`, e.message);
       }
     }
    }));
    
    return deleted;
  } catch (error) {
    throw error;
  }
};

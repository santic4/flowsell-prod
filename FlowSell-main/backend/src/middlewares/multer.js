import multer, { memoryStorage } from 'multer';

// Configuración de Multer para manejar la carga de archivos en memoria
const storage = memoryStorage();

// Configuración de Multer con límite de tamaño
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('Solo se permiten imágenes JPG, PNG o WEBP.');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

export { upload };

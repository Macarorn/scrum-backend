import multer from "multer";
import path from "path";

// Límite de tamaño: 25 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  "application/pdf", // .pdf
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
];

// Extensiones permitidas (como capa adicional de seguridad)
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Tipo de archivo no permitido. Solo se permiten archivos PDF, Word, Excel y PowerPoint."));
  }

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error("Extensión de archivo no permitida."));
  }

  cb(null, true);
};

export const uploadDocumento = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "FILE_TOO_LARGE",
        message: "El archivo excede el tamaño máximo permitido de 25 MB.",
      });
    }
    return res.status(400).json({
      success: false,
      error: "UPLOAD_ERROR",
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: "INVALID_FILE",
      message: err.message,
    });
  }
  next();
};

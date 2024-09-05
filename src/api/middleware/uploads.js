const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuramos multer para el almacenamiento de imágenes.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Usa path.resolve para obtener una ruta absoluta.
    const uploadsDir = path.resolve(__dirname, "../../uploads");

    // Comprueba si la carpeta existe o no.
    fs.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK, (err) => {
      if (err) {
        console.error(
          `Carpeta no encontrada o sin permiso de escritura: ${uploadsDir}`
        );
        // Crea la carpeta si no existe con { recursive: true }.
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    });
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único para el archivo.
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const uploads = multer({ storage: storage });

module.exports = uploads;

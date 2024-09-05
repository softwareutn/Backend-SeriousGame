const fs = require('fs');
const path = require('path');
const pool = require("../../config/db");

exports.destroy = async (req, res, next) => {
  try {
    // Paso 1: Obtener las rutas de las imágenes desde la base de datos
    const { rows } = await pool.query('SELECT imagen FROM conceptos WHERE imagen IS NOT NULL');
    const dbImages = new Set(rows.map(row => row.imagen));

    // Paso 2: Leer el directorio de uploads
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('Error al leer el directorio de uploads', err);
        return next(err); // Pasar el error al siguiente middleware de manejo de errores
      }

      // Paso 3: Eliminar archivos que no están en la base de datos
      files.forEach(file => {
        if (!dbImages.has(file)) {
          fs.unlink(path.join(uploadsDir, file), err => {
            if (err) {
              console.error(`Error al eliminar el archivo no necesario: ${file}`, err);
            } else {
              console.log(`Archivo eliminado con éxito: ${file}`);
            }
          });
        }
      });

      next(); // Continuar con el siguiente middleware o terminar aquí si es el último
    });
  } catch (error) {
    console.error('Error al limpiar imágenes', error);
    next(error); // Pasar el error al siguiente middleware de manejo de errores
  }
}

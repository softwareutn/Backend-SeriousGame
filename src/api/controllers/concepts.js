const pool = require("../../config/db");
const Joi = require("joi");

// Validación de datos
const conceptSchema = Joi.object({
  titulo: Joi.string().max(255).required(),
  descripcion: Joi.string().required(),
  categoria_id: Joi.number().integer().required(),
  imagenExistente: Joi.string().optional(),
  estado: Joi.boolean().default(true),
});

// Obtener todas las categorías
exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categorias");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los conceptos (con búsqueda por categoría y título)
exports.getAllConcepts = async (req, res) => {
  const { titulo, categoria_id } = req.query;

  let baseQuery = `
    SELECT c.concepto_id, c.titulo, c.descripcion, c.imagen, c.categoria_id, cat.nombre_categoria AS categoria, c.estado 
    FROM conceptos c
    JOIN categorias cat ON c.categoria_id = cat.categoria_id
  `;

  let conditions = [];
  let values = [];

  if (titulo) {
    conditions.push(`c.titulo ILIKE $${conditions.length + 1}`);
    values.push(`%${titulo}%`);
  }

  if (categoria_id) {
    conditions.push(`c.categoria_id = $${conditions.length + 1}`);
    values.push(categoria_id);
  }

  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(" AND ")}`;
  }

  try {
    const result = await pool.query(baseQuery, values);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener conceptos activos
exports.getActiveConcepts = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT c.concepto_id, c.titulo, c.descripcion, c.imagen, c.categoria_id, cat.nombre_categoria AS categoria, c.estado 
      FROM conceptos c
      JOIN categorias cat ON c.categoria_id = cat.categoria_id
      WHERE c.estado = true
    `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener concepto por ID
exports.getConceptById = async (req, res) => {
  const { concepto_id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT c.concepto_id, c.titulo, c.descripcion, c.imagen, c.categoria_id, cat.nombre_categoria AS categoria, c.estado 
      FROM conceptos c
      JOIN categorias cat ON c.categoria_id = cat.categoria_id
      WHERE c.concepto_id = $1
    `,
      [concepto_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concepto no encontrado" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Agregar concepto
exports.addConcept = async (req, res) => {
  const { error, value } = conceptSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { titulo, descripcion, categoria_id, estado } = value;
  const imagenPath = req.file ? req.file.filename : "";

  try {
    const result = await pool.query(
      "INSERT INTO conceptos (titulo, descripcion, imagen, categoria_id, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [titulo, descripcion, imagenPath, categoria_id, estado]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un concepto
exports.updateConcept = async (req, res) => {
  const { concepto_id } = req.params;
  const { error, value } = conceptSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { titulo, descripcion, categoria_id, imagenExistente, estado } = value;
  const imagenPath = req.file ? req.file.filename : imagenExistente;

  try {
    const result = await pool.query(
      "UPDATE conceptos SET titulo = $1, descripcion = $2, imagen = $3, categoria_id = $4, estado = $5 WHERE concepto_id = $6 RETURNING *",
      [titulo, descripcion, imagenPath, categoria_id, estado, concepto_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concepto no encontrado" });
    }

    const updatedConcepto = result.rows[0];
    res.status(200).json(updatedConcepto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar un concepto
exports.deleteConcept = async (req, res) => {
  const { concepto_id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM conceptos WHERE concepto_id = $1 RETURNING *",
      [concepto_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Concepto no encontrado" });
    }
    res.status(200).json({
      message: "Concepto eliminado exitosamente",
      concept: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buscar conceptos por estado (activos/inactivos)
exports.getConceptsByState = async (req, res) => {
  const { estado } = req.query;

  if (estado === undefined) {
    return res.status(400).json({ error: "El estado es requerido" });
  }

  try {
    const result = await pool.query(
      `
      SELECT c.concepto_id, c.titulo, c.descripcion, c.imagen, c.categoria_id, cat.nombre_categoria AS categoria, c.estado 
      FROM conceptos c
      JOIN categorias cat ON c.categoria_id = cat.categoria_id
      WHERE c.estado = $1
    `,
      [estado]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

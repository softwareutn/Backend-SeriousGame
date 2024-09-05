const pool = require("../../config/db");
const Joi = require("joi");

const categorySchema = Joi.object({
  nombre_categoria: Joi.string().max(100).required(),
});

const tipoEjercicioSchema = Joi.object({
  nombre_tipo: Joi.string().max(50).required(),
});

//CRUD para las categorias - Conceptos
exports.getAllCategories = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categorias");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getCategoryById = async (req, res) => {
  const { categoria_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM categorias WHERE categoria_id = $1",
      [categoria_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addCategory = async (req, res) => {
  const { error, value } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { nombre_categoria } = value;
  try {
    const result = await pool.query(
      "INSERT INTO categorias (nombre_categoria) VALUES ($1) RETURNING *",
      [nombre_categoria]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  const { categoria_id } = req.params;
  const { error, value } = categorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { nombre_categoria } = value;
  try {
    const result = await pool.query(
      "UPDATE categorias SET nombre_categoria = $1 WHERE categoria_id = $2 RETURNING *",
      [nombre_categoria, categoria_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  const { categoria_id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM categorias WHERE categoria_id = $1 RETURNING *",
      [categoria_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.status(200).json({
      message: "Categoría eliminada exitosamente",
      category: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//CRUD para las categorias de los ejercicios.
exports.getAllTiposEjercicios = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tipo_ejercicios");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTipoEjercicioById = async (req, res) => {
  const { tipo_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM tipo_ejercicios WHERE tipo_id = $1",
      [tipo_id]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Tipo de ejercicio no encontrado" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addTipoEjercicio = async (req, res) => {
  const { error, value } = tipoEjercicioSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { nombre_tipo } = value;
  try {
    const result = await pool.query(
      "INSERT INTO tipo_ejercicios (nombre_tipo) VALUES ($1) RETURNING *",
      [nombre_tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTipoEjercicio = async (req, res) => {
  const { tipo_id } = req.params;
  const { error, value } = tipoEjercicioSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { nombre_tipo } = value;
  try {
    const result = await pool.query(
      "UPDATE tipo_ejercicios SET nombre_tipo = $1 WHERE tipo_id = $2 RETURNING *",
      [nombre_tipo, tipo_id]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Tipo de ejercicio no encontrado" });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTipoEjercicio = async (req, res) => {
  const { tipo_id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM tipo_ejercicios WHERE tipo_id = $1 RETURNING *",
      [tipo_id]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Tipo de ejercicio no encontrado" });
    }
    res
      .status(200)
      .json({
        message: "Tipo de ejercicio eliminado exitosamente",
        tipoEjercicio: result.rows[0],
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

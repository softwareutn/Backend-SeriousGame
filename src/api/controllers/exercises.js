const pool = require("../../config/db");
const Joi = require("joi");

// Validación de datos
const exerciseSchema = Joi.object({
  pregunta: Joi.string().required(),
  tipo_id: Joi.number().integer().required(),
  detalles: Joi.string().optional(),
  mostrar_solucion: Joi.boolean().optional(),
  explicacion_solucion: Joi.string().optional(),
  estado: Joi.boolean().optional(),
  opcionesMultiples: Joi.string().optional(), // JSON string
  matrizPunnett: Joi.string().optional(), // JSON string
  opcionesInteractivas: Joi.string().optional(), // JSON string
});

// Obtener todos los tipos de ejercicios
exports.getTiposEjercicios = async (req, res) => {
  const client = await pool.connect();
  try {
    const tiposQuery = `SELECT * FROM tipo_ejercicios ORDER BY tipo_id`;
    const { rows } = await client.query(tiposQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los tipos de ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.addExercise = async (req, res) => {
  // Validar datos con Joi
  const { error, value } = exerciseSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const {
    pregunta,
    tipo_id,
    detalles,
    mostrar_solucion,
    explicacion_solucion,
    estado,
    opcionesMultiples,
    matrizPunnett,
  } = value;

  const imagenPath = req.file ? req.file.filename : null;
  const estadoValue = estado !== undefined ? estado : true;

  let opcionesMultiplesParsed = opcionesMultiples
    ? JSON.parse(opcionesMultiples)
    : [];
  let matrizPunnettParsed = matrizPunnett ? JSON.parse(matrizPunnett) : [];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const newExercise = await client.query(
      "INSERT INTO ejercicios (pregunta, imagen, tipo_id, detalles, mostrar_solucion, explicacion_solucion, estado) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [
        pregunta,
        imagenPath,
        tipo_id,
        detalles,
        mostrar_solucion,
        explicacion_solucion,
        estadoValue,
      ]
    );

    const ejercicioId = newExercise.rows[0].ejercicio_id;

    if (opcionesMultiplesParsed.length > 0) {
      for (const opcion of opcionesMultiplesParsed) {
        await client.query(
          "INSERT INTO opciones_ejercicios (ejercicio_id, texto_opcion, es_correcta, tipo) VALUES ($1, $2, $3, 'multiple')",
          [ejercicioId, opcion.texto_opcion, opcion.es_correcta]
        );
      }
    }

    if (matrizPunnettParsed.length > 0) {
      for (const cell of matrizPunnettParsed) {
        await client.query(
          "INSERT INTO matriz_punnett (ejercicio_id, alelo1, alelo2, resultado) VALUES ($1, $2, $3, $4)",
          [ejercicioId, cell.alelo1, cell.alelo2, cell.resultado]
        );
      }
    }

    await client.query("COMMIT");

    const exerciseQuery = `
      SELECT e.*, 
             array_to_json(array_agg(mo)) as opciones_multiples,
             array_to_json(array_agg(mp)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.ejercicio_id = $1
      GROUP BY e.ejercicio_id;
    `;
    const completeExercise = await client.query(exerciseQuery, [ejercicioId]);

    res.status(201).json({
      message: "Ejercicio creado exitosamente",
      ejercicio: completeExercise.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error durante la transacción:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getAllExercises = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
    SELECT e.*, 
           te.nombre_tipo,
           array_to_json(array_agg(DISTINCT io.*)) as opciones_interactivas,
           array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
           array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
    FROM ejercicios e
    LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
    LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
    LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
    LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
    WHERE e.estado = true
    GROUP BY e.ejercicio_id, te.tipo_id
    ORDER BY e.ejercicio_id desc;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getExerciseById = async (req, res) => {
  const { ejercicioId } = req.params;
  const client = await pool.connect();

  try {
    const exerciseQuery = `
      SELECT e.*, 
             te.nombre_tipo,
             COALESCE(json_agg(DISTINCT io.*) FILTER (WHERE io.ejercicio_id IS NOT NULL), '[]') as opciones_interactivas,
             COALESCE(json_agg(DISTINCT mo.*) FILTER (WHERE mo.ejercicio_id IS NOT NULL), '[]') as opciones_multiples,
             COALESCE(json_agg(DISTINCT mp.*) FILTER (WHERE mp.ejercicio_id IS NOT NULL), '[]') as matriz_punnett
      FROM ejercicios e
      LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
      LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.ejercicio_id = $1
      GROUP BY e.ejercicio_id, te.tipo_id;
    `;

    const { rows } = await client.query(exerciseQuery, [ejercicioId]);
    if (rows.length === 0) {
      res.status(404).json({ message: "Ejercicio no encontrado" });
    } else {
      res.status(200).json(rows[0]);
    }
  } catch (error) {
    console.error("Error al obtener el ejercicio:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getInteractivos = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE mo.ejercicio_id IS NOT NULL AND mp.ejercicio_id IS NOT NULL AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getOpcionesMultiples = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      WHERE mo.ejercicio_id IS NOT NULL AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.updateExercise = async (req, res) => {
  const { ejercicioId } = req.params;
  const {
    pregunta,
    tipo_id,
    detalles,
    mostrar_solucion,
    explicacion_solucion,
    estado,
    opcionesMultiples,
    matrizPunnett,
  } = req.body;

  const imagenPath = req.file ? req.file.filename : req.body.imagenActual;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const exerciseUpdateQuery = `
      UPDATE ejercicios
      SET pregunta = $1, imagen = COALESCE($2, imagen), tipo_id = $3, detalles = $4, mostrar_solucion = $5, explicacion_solucion = $6, estado = $7
      WHERE ejercicio_id = $8
      RETURNING *;
    `;
    const updatedExercise = await client.query(exerciseUpdateQuery, [
      pregunta,
      imagenPath,
      tipo_id,
      detalles,
      mostrar_solucion,
      explicacion_solucion,
      estado,
      ejercicioId,
    ]);

    if (updatedExercise.rowCount === 0) {
      throw new Error("El ejercicio no existe.");
    }

    await client.query(
      "DELETE FROM opciones_ejercicios WHERE ejercicio_id = $1",
      [ejercicioId]
    );

    await client.query("DELETE FROM matriz_punnett WHERE ejercicio_id = $1", [
      ejercicioId,
    ]);

    if (opcionesMultiples) {
      const opcionesMultiplesParsed = JSON.parse(opcionesMultiples);
      for (const opcion of opcionesMultiplesParsed) {
        await client.query(
          "INSERT INTO opciones_ejercicios (ejercicio_id, texto_opcion, es_correcta, tipo) VALUES ($1, $2, $3, 'multiple')",
          [ejercicioId, opcion.texto_opcion, opcion.es_correcta]
        );
      }
    }

    if (matrizPunnett) {
      const matrizPunnettParsed = JSON.parse(matrizPunnett);
      for (const cell of matrizPunnettParsed) {
        await client.query(
          "INSERT INTO matriz_punnett (ejercicio_id, alelo1, alelo2, resultado) VALUES ($1, $2, $3, $4)",
          [ejercicioId, cell.alelo1, cell.alelo2, cell.resultado]
        );
      }
    }

    await client.query("COMMIT");

    const exerciseQuery = `
      SELECT e.*, 
             te.nombre_tipo,
             array_to_json(array_agg(DISTINCT io.*)) as opciones_interactivas,
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
      LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.ejercicio_id = $1
      GROUP BY e.ejercicio_id, te.tipo_id;
    `;
    const completeExercise = await client.query(exerciseQuery, [ejercicioId]);

    res.status(200).json({
      message: "Ejercicio actualizado exitosamente",
      ejercicio: completeExercise.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en la transacción", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.deleteExercise = async (req, res) => {
  const { ejercicioId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Eliminar opciones asociadas
    await client.query(
      "DELETE FROM opciones_ejercicios WHERE ejercicio_id = $1",
      [ejercicioId]
    );

    // Eliminar matriz punnett asociada
    await client.query("DELETE FROM matriz_punnett WHERE ejercicio_id = $1", [
      ejercicioId,
    ]);

    // Eliminar el ejercicio en sí
    const result = await client.query(
      "DELETE FROM ejercicios WHERE ejercicio_id = $1 RETURNING *",
      [ejercicioId]
    );

    if (result.rowCount === 0) {
      throw new Error("El ejercicio no existe.");
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Ejercicio eliminado exitosamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.searchExercisesByPregunta = async (req, res) => {
  const { pregunta } = req.query;
  const client = await pool.connect();
  try {
    const searchQuery = `
      SELECT e.*, 
             te.nombre_tipo,
             array_to_json(array_agg(DISTINCT io.*)) as opciones_interactivas,
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
      LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.pregunta ILIKE $1 AND e.estado = true
      GROUP BY e.ejercicio_id, te.tipo_id
      ORDER BY e.ejercicio_id;
    `;
    const { rows } = await client.query(searchQuery, [`%${pregunta}%`]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al buscar ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Obtener ejercicios activos
exports.getActiveExercises = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             te.nombre_tipo,
             array_to_json(array_agg(DISTINCT io.*)) as opciones_interactivas,
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
      LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.estado = true
      GROUP BY e.ejercicio_id, te.tipo_id
      ORDER BY e.ejercicio_id desc;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios activos:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Endpoint para obtener ejercicios de Selección Múltiple activos
exports.getMultipleChoiceExercises = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      WHERE e.tipo_id = 1 AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error(
      "Error al obtener los ejercicios de Selección Múltiple activos:",
      error
    );
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getPunnettExercises = async (req, res) => {
  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE mo.ejercicio_id IS NOT NULL AND mp.ejercicio_id IS NOT NULL AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Buscar ejercicios por tipo (Selección Múltiple o Punnett)
exports.getExercisesByType = async (req, res) => {
  const { tipo } = req.query;

  if (!tipo) {
    return res.status(400).json({ error: "El tipo de ejercicio es requerido" });
  }

  let exercisesQuery;

  if (tipo === "seleccion_multiple") {
    exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      WHERE e.tipo_id = 1 AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
  } else if (tipo === "punnett") {
    exercisesQuery = `
      SELECT e.*, 
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE mo.ejercicio_id IS NOT NULL AND mp.ejercicio_id IS NOT NULL AND e.estado = true
      GROUP BY e.ejercicio_id
      ORDER BY e.ejercicio_id;
    `;
  } else {
    return res.status(400).json({ error: "Tipo de ejercicio no válido" });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(exercisesQuery);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Buscar ejercicios por estado (activos/inactivos)
exports.getExercisesByState = async (req, res) => {
  const { estado } = req.query;

  if (estado === undefined) {
    return res
      .status(400)
      .json({ error: "El estado del ejercicio es requerido" });
  }

  let estadoValue;
  if (estado === "true") {
    estadoValue = true;
  } else if (estado === "false") {
    estadoValue = false;
  } else {
    return res.status(400).json({ error: "Estado del ejercicio no válido" });
  }

  const client = await pool.connect();
  try {
    const exercisesQuery = `
      SELECT e.*, 
             te.nombre_tipo,
             array_to_json(array_agg(DISTINCT io.*)) as opciones_interactivas,
             array_to_json(array_agg(DISTINCT mo.*)) as opciones_multiples,
             array_to_json(array_agg(DISTINCT mp.*)) as matriz_punnett
      FROM ejercicios e
      LEFT JOIN tipo_ejercicios te ON e.tipo_id = te.tipo_id
      LEFT JOIN opciones_ejercicios io ON e.ejercicio_id = io.ejercicio_id AND io.tipo = 'interactiva'
      LEFT JOIN opciones_ejercicios mo ON e.ejercicio_id = mo.ejercicio_id AND mo.tipo = 'multiple'
      LEFT JOIN matriz_punnett mp ON e.ejercicio_id = mp.ejercicio_id
      WHERE e.estado = $1
      GROUP BY e.ejercicio_id, te.tipo_id
      ORDER BY e.ejercicio_id desc;
    `;
    const { rows } = await client.query(exercisesQuery, [estadoValue]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los ejercicios por estado:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

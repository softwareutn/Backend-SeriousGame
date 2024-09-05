const pool = require("../../config/db");
const Joi = require("joi");

const evaluationSchema = Joi.object({
  texto_pregunta: Joi.string().required(),
  tipo_pregunta: Joi.string().required(),
  detalles: Joi.string().optional(),
  explicacion_solucion: Joi.string().optional(),
  estado: Joi.boolean().optional(),
  opciones: Joi.array()
    .items(
      Joi.object({
        texto_opcion: Joi.string().required(),
        es_correcta: Joi.boolean().required(),
      })
    )
    .required(),
});

exports.createEvaluation = async (req, res) => {
  const {
    texto_pregunta,
    detalles,
    explicacion_solucion,
    estado,
    concepto_id,
    ejercicio_id,
  } = req.body;
  const opciones = JSON.parse(req.body.opciones || "[]");
  const imagePath = req.file ? `${req.file.filename}` : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertQuestionText = `
    INSERT INTO preguntas_evaluacion (texto_pregunta, imagen, tipo_pregunta, detalles, explicacion_solucion, estado, concepto_id, ejercicio_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const newQuestion = await client.query(insertQuestionText, [
      texto_pregunta,
      imagePath,
      "Selección Múltiple",
      detalles,
      explicacion_solucion,
      estado,
      concepto_id || null,
      ejercicio_id || null,
    ]);

    const questionDetails = newQuestion.rows[0];

    for (const opcion of opciones) {
      const insertOptionText = `
      INSERT INTO opciones_preguntas (pregunta_id, texto_opcion, es_correcta)
      VALUES ($1, $2, $3);`;
      await client.query(insertOptionText, [
        questionDetails.pregunta_id,
        opcion.texto_opcion,
        opcion.es_correcta,
      ]);
    }

    await client.query("COMMIT");
    res.status(201).json({
      pregunta: questionDetails,
      mensaje: "Pregunta creada exitosamente.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getAllQuestions = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const questionsResult = await client.query(
      `SELECT pe.*, 
              c.titulo AS concepto_titulo, 
              e.pregunta AS ejercicio_pregunta
       FROM preguntas_evaluacion pe
       LEFT JOIN conceptos c ON pe.concepto_id = c.concepto_id
       LEFT JOIN ejercicios e ON pe.ejercicio_id = e.ejercicio_id`
    );
    const questions = questionsResult.rows;

    const optionsResult = await client.query(
      "SELECT * FROM opciones_preguntas"
    );
    const options = optionsResult.rows;

    const optionsMap = options.reduce((map, option) => {
      if (!map[option.pregunta_id]) {
        map[option.pregunta_id] = [];
      }
      map[option.pregunta_id].push(option);
      return map;
    }, {});

    const questionsWithDetails = questions.map((question) => ({
      ...question,
      opciones: optionsMap[question.pregunta_id] || [],
    }));

    await client.query("COMMIT");
    res.status(200).json(questionsWithDetails);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getQuestionById = async (req, res) => {
  const { preguntaId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const questionResult = await client.query(
      `SELECT pe.*, e.pregunta AS ejercicio_pregunta
       FROM preguntas_evaluacion pe
       LEFT JOIN ejercicios e ON pe.ejercicio_id = e.ejercicio_id
       WHERE pe.pregunta_id = $1`,
      [preguntaId]
    );
    const question = questionResult.rows[0];

    if (!question) {
      await client.query("COMMIT");
      return res.status(404).json({ mensaje: "Pregunta no encontrada." });
    }

    const optionsResult = await client.query(
      "SELECT * FROM opciones_preguntas WHERE pregunta_id = $1",
      [preguntaId]
    );
    const options = optionsResult.rows;

    await client.query("COMMIT");
    res.status(200).json({
      ...question,
      opciones: options,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status500.json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.updateQuestion = async (req, res) => {
  const { preguntaId } = req.params;
  const {
    texto_pregunta,
    tipo_pregunta,
    detalles,
    explicacion_solucion,
    estado,
    opciones,
    concepto_id,
    ejercicio_id,
  } = req.body;
  const opcionesParsed = JSON.parse(opciones || "[]");
  const imagePath = req.file ? `${req.file.filename}` : req.body.imagenExistente;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updateQuestionText = `
      UPDATE preguntas_evaluacion
      SET texto_pregunta = $1, imagen = $2, tipo_pregunta = $3, detalles = $4, explicacion_solucion = $5, estado = $6, concepto_id = $7, ejercicio_id = $8
      WHERE pregunta_id = $9
      RETURNING *;`;
    const updatedQuestion = await client.query(updateQuestionText, [
      texto_pregunta,
      imagePath,
      tipo_pregunta,
      detalles,
      explicacion_solucion,
      estado,
      concepto_id ? concepto_id : null,
      ejercicio_id ? ejercicio_id : null,
      preguntaId,
    ]);

    if (updatedQuestion.rowCount === 0) {
      throw new Error("Pregunta no encontrada.");
    }

    await client.query(
      "DELETE FROM opciones_preguntas WHERE pregunta_id = $1",
      [preguntaId]
    );

    for (const opcion of opcionesParsed) {
      const insertOptionText = `
        INSERT INTO opciones_preguntas (pregunta_id, texto_opcion, es_correcta)
        VALUES ($1, $2, $3);`;
      await client.query(insertOptionText, [
        preguntaId,
        opcion.texto_opcion,
        opcion.es_correcta,
      ]);
    }

    await client.query("COMMIT");
    res.status(200).json({
      pregunta: updatedQuestion.rows[0],
      mensaje: "Pregunta actualizada exitosamente.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.deleteQuestion = async (req, res) => {
  const { preguntaId } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM opciones_preguntas WHERE pregunta_id = $1",
      [preguntaId]
    );

    const deleteQuestionText =
      "DELETE FROM preguntas_evaluacion WHERE pregunta_id = $1 RETURNING *";
    const deletedQuestion = await client.query(deleteQuestionText, [
      preguntaId,
    ]);

    if (deletedQuestion.rowCount === 0) {
      return res.status(404).json({ mensaje: "Pregunta no encontrada." });
    }

    await client.query("COMMIT");
    res.status(200).json({ mensaje: "Pregunta eliminada exitosamente." });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.searchQuestions = async (req, res) => {
  const { query } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const searchResult = await client.query(
      "SELECT * FROM preguntas_evaluacion WHERE texto_pregunta ILIKE $1",
      [`%${query}%`]
    );
    const questions = searchResult.rows;

    const optionsResult = await client.query(
      "SELECT * FROM opciones_preguntas"
    );
    const options = optionsResult.rows;

    const optionsMap = options.reduce((map, option) => {
      if (!map[option.pregunta_id]) {
        map[option.pregunta_id] = [];
      }
      map[option.pregunta_id].push(option);
      return map;
    }, {});

    const questionsWithDetails = questions.map((question) => ({
      ...question,
      opciones: optionsMap[question.pregunta_id] || [],
    }));

    await client.query("COMMIT");
    res.status(200).json(questionsWithDetails);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Obtener evaluaciones por estado
exports.getEvaluationsByState1 = async (req, res) => {
  const client = await pool.connect();
  const { estado } = req.query;

  try {
    await client.query("BEGIN");

    const questionsResult = await client.query(
      `SELECT pe.*, 
              c.titulo AS concepto_titulo, 
              e.pregunta AS ejercicio_pregunta
       FROM preguntas_evaluacion pe
       LEFT JOIN conceptos c ON pe.concepto_id = c.concepto_id
       LEFT JOIN ejercicios e ON pe.ejercicio_id = e.ejercicio_id
       WHERE pe.estado = $1`,
      [estado === "true"]
    );
    const questions = questionsResult.rows;

    const optionsResult = await client.query(
      "SELECT * FROM opciones_preguntas"
    );
    const options = optionsResult.rows;

    const optionsMap = options.reduce((map, option) => {
      if (!map[option.pregunta_id]) {
        map[option.pregunta_id] = [];
      }
      map[option.pregunta_id].push(option);
      return map;
    }, {});

    const questionsWithDetails = questions.map((question) => ({
      ...question,
      opciones: optionsMap[question.pregunta_id] || [],
    }));

    await client.query("COMMIT");
    res.status(200).json(questionsWithDetails);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getQuestionsBySource = async (req, res) => {
  const { source } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let filterQuery = "";
    if (source === "conceptos") {
      filterQuery = "pe.concepto_id IS NOT NULL";
    } else if (source === "ejercicios") {
      filterQuery = "pe.ejercicio_id IS NOT NULL";
    } else {
      throw new Error("Filtro inválido. Use 'conceptos' o 'ejercicios'.");
    }

    const questionsResult = await client.query(
      `SELECT pe.*, 
              c.titulo AS concepto_titulo, 
              e.pregunta AS ejercicio_pregunta
       FROM preguntas_evaluacion pe
       LEFT JOIN conceptos c ON pe.concepto_id = c.concepto_id
       LEFT JOIN ejercicios e ON pe.ejercicio_id = e.ejercicio_id
       WHERE ${filterQuery}`
    );
    const questions = questionsResult.rows;

    const optionsResult = await client.query(
      "SELECT * FROM opciones_preguntas"
    );
    const options = optionsResult.rows;

    const optionsMap = options.reduce((map, option) => {
      if (!map[option.pregunta_id]) {
        map[option.pregunta_id] = [];
      }
      map[option.pregunta_id].push(option);
      return map;
    }, {});

    const questionsWithDetails = questions.map((question) => ({
      ...question,
      opciones: optionsMap[question.pregunta_id] || [],
    }));

    await client.query("COMMIT");
    res.status(200).json(questionsWithDetails);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

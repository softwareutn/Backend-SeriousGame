-- Crear la tabla de usuarios para docentes y administradores
CREATE TABLE usuarios (
    usuario_id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    contraseña_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('docente', 'administrador')), -- Asegura que el rol sea 'docente' o 'administrador'
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear la tabla de conceptos
CREATE TABLE conceptos (
    concepto_id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    imagen VARCHAR(255), -- Opcional: camino a la imagen relacionada
    categoria VARCHAR(100)
);

-- Crear la tabla de ejercicios
CREATE TABLE ejercicios (
    ejercicio_id SERIAL PRIMARY KEY,
    pregunta TEXT NOT NULL,
    imagen VARCHAR(255), -- Opcional: camino a la imagen relacionada
    tipo VARCHAR(50) NOT NULL, -- 'Punnett', 'Cruzamiento', 'Selección Múltiple', 'Verdadero/Falso', 'Completar', 'Pedigrí'
    detalles TEXT, -- Detalles adicionales para resolver el ejercicio
    mostrar_solucion BOOLEAN DEFAULT FALSE,
    explicacion_solucion TEXT
);

-- Crear la tabla de opciones de ejercicios
CREATE TABLE opciones_ejercicios (
    opcion_id SERIAL PRIMARY KEY,
    ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(ejercicio_id),
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL
);

-- Crear la tabla de evaluaciones
CREATE TABLE evaluaciones (
    evaluacion_id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL
);

-- Crear la tabla de preguntas de evaluación
CREATE TABLE preguntas_evaluacion (
    pregunta_id SERIAL PRIMARY KEY,
    texto_pregunta TEXT NOT NULL,
    imagen VARCHAR(255), -- Opcional: camino a la imagen relacionada
    tipo VARCHAR(50) -- 'Opción Múltiple', 'Abierta', etc.
);

-- Crear la tabla de opciones para las preguntas de evaluación
CREATE TABLE opciones_preguntas (
    opcion_id SERIAL PRIMARY KEY,
    pregunta_id INTEGER NOT NULL REFERENCES preguntas_evaluacion(pregunta_id),
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL
);

-- Crear la tabla de relación entre preguntas de evaluación y conceptos
CREATE TABLE pregunta_concepto (
    pregunta_id INTEGER NOT NULL REFERENCES preguntas_evaluacion(pregunta_id),
    concepto_id INTEGER NOT NULL REFERENCES conceptos(concepto_id),
    PRIMARY KEY (pregunta_id, concepto_id)
);

-- Crear la tabla de relación entre preguntas de evaluación y ejercicios
CREATE TABLE pregunta_ejercicio (
    pregunta_id INTEGER NOT NULL REFERENCES preguntas_evaluacion(pregunta_id),
    ejercicio_id INTEGER NOT NULL REFERENCES ejercicios(ejercicio_id),
    PRIMARY KEY (pregunta_id, ejercicio_id)
);

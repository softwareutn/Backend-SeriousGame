const express = require('express');
const userController = require('../controllers/users');
const conceptsController = require('../controllers/concepts');
const exercisesController = require('../controllers/exercises');
const evalutionController = require('../controllers/evaluacion');
const categoriasController = require('../controllers/categorias');
const uploads = require('../middleware/uploads');
const { destroy } = require('../middleware/destroy');
const authenticateToken = require('../middleware/checkAuth');
const router = express.Router();

// Rutas para operaciones CRUD de los usuarios
router.get('/getusers', authenticateToken, userController.getAllUsers);
router.get('/getusers/:userId', authenticateToken, userController.getUser);
router.post('/adduser', authenticateToken, userController.addUser);
router.put('/putusers/:userId', authenticateToken, userController.updateUser);
router.delete('/deleteusers/:userId', authenticateToken, destroy, userController.deleteUser);
router.get('/searchusers', authenticateToken, userController.searchUsers);

// Rutas para operaciones CRUD de los conceptos
router.post('/postconceptos', authenticateToken, uploads.single('imagen'), conceptsController.addConcept);
router.get('/getconceptos/', conceptsController.getAllConcepts);
router.get('/conceptos/:concepto_id', conceptsController.getConceptById);
router.put('/edit/:concepto_id', authenticateToken, uploads.single('imagen'), conceptsController.updateConcept);
router.delete('/deleteconceptos/:concepto_id', authenticateToken, destroy, conceptsController.deleteConcept);
router.get('/categorias', conceptsController.getAllCategories);
router.get('/conceptos-activos', conceptsController.getActiveConcepts);
router.get('/search/state', authenticateToken, conceptsController.getConceptsByState);

// Rutas para los ejercicios
router.post('/postejercicios', authenticateToken, uploads.single('imagen'), exercisesController.addExercise);
router.get('/getejercicios', exercisesController.getAllExercises);
router.get('/getejercicios/:ejercicioId', exercisesController.getExerciseById);
router.get('/ejercicios/interactivos', exercisesController.getInteractivos);
router.get('/ejercicios/opcionesmultiples', exercisesController.getOpcionesMultiples);
router.put('/updateejercicio/:ejercicioId', authenticateToken, uploads.single('imagen'), exercisesController.updateExercise);
router.delete('/deleteejercicio/:ejercicioId', authenticateToken, destroy, exercisesController.deleteExercise);
router.get('/tipos', exercisesController.getTiposEjercicios);
router.get('/buscarejercicios', exercisesController.searchExercisesByPregunta);
router.get('/ejercicios/activos', exercisesController.getActiveExercises);
router.get('/ejercicios/opcionmultiple-activos', exercisesController.getMultipleChoiceExercises);
router.get('/ejercicios/punnett-activos', exercisesController.getPunnettExercises);
router.get('/busqueda/tipo-ejercicio', exercisesController.getExercisesByType);
router.get('/busqueda/activos',  exercisesController.getExercisesByState);

// Rutas para la evaluación
router.post('/preguntas', authenticateToken, uploads.single('imagen'), evalutionController.createEvaluation);
router.get('/preguntas/obtener', evalutionController.getAllQuestions);
router.get('/preguntas/:preguntaId', evalutionController.getQuestionById);
router.put('/preguntas/:preguntaId', authenticateToken, uploads.single('imagen'), evalutionController.updateQuestion);
router.delete('/preguntas/:preguntaId', authenticateToken, destroy, evalutionController.deleteQuestion);
router.get('/search/:query', evalutionController.searchQuestions);
router.get('/evaluaciones/activos', evalutionController.getEvaluationsByState1);
router.get('/evaluaciones/preguntas/:source', evalutionController.getQuestionsBySource);

// Rutas para operaciones CRUD de las categorías
router.get('/categorias', categoriasController.getAllCategories);
router.get('/categorias/:categoria_id', categoriasController.getCategoryById);
router.post('/categorias', authenticateToken, categoriasController.addCategory);
router.put('/categorias/:categoria_id', authenticateToken, categoriasController.updateCategory);
router.delete('/categorias/:categoria_id', authenticateToken, categoriasController.deleteCategory);

// Rutas para operaciones CRUD de los tipos de ejercicios
router.get('/tipo_ejercicios', categoriasController.getAllTiposEjercicios);
router.get('/tipo_ejercicios/:tipo_id', categoriasController.getTipoEjercicioById);
router.post('/tipo_ejercicios', authenticateToken, categoriasController.addTipoEjercicio);
router.put('/tipo_ejercicios/:tipo_id', authenticateToken, categoriasController.updateTipoEjercicio);
router.delete('/tipo_ejercicios/:tipo_id', authenticateToken, categoriasController.deleteTipoEjercicio);

module.exports = router;

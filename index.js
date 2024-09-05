const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./src/api/routes/authRoutes");
const rutas = require("./src/api/routes/rutas");
const { destroy } = require("./src/api/middleware/destroy");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/src/uploads/", express.static("src/uploads"));
app.post("/destroy", destroy, (req, res) => {
  res.send("Middleware completado, imágenes limpias.");
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api", rutas);

// Inicializamos el servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app;

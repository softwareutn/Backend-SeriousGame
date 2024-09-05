const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");

// Registrar un nuevo usuario
exports.signup = async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = await pool.query(
      "INSERT INTO usuarios (nombre, email, contraseña_hash, rol_id) VALUES ($1, $2, $3, (SELECT rol_id FROM roles WHERE nombre_rol = $4)) RETURNING *",
      [req.body.nombre, req.body.email, hashedPassword, req.body.rol]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Aquí el usuario puede logearse y obtendrá un JWT
exports.login = async (req, res) => {
  try {
    const user = await pool.query("SELECT * FROM usuarios WHERE email = $1", [
      req.body.email,
    ]);
    if (user.rows.length === 0) {
      return res.status(401).send("Auth failed");
    }

    const match = await bcrypt.compare(
      req.body.password,
      user.rows[0].contraseña_hash
    );
    if (!match) {
      return res.status(401).send("Auth failed");
    }

    const token = jwt.sign(
      {
        userId: user.rows[0].usuario_id,
        email: user.rows[0].email,
        rol: user.rows[0].rol_id,
      },
      process.env.JWT_SECRET, // Utiliza una clave secreta de tu archivo .env
      { expiresIn: "1h" }
    );

    res.status(200).json({ token: token, user: user.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener perfil del usuario autenticado
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await pool.query(
      `SELECT usuario_id, nombre, email, roles.nombre_rol AS rol, fecha_registro 
      FROM usuarios 
      JOIN roles ON usuarios.rol_id = roles.rol_id 
      WHERE usuario_id = $1`,
      [userId]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar la contraseña del usuario
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    const user = await pool.query(
      "SELECT * FROM usuarios WHERE usuario_id = $1",
      [userId]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(
      oldPassword,
      user.rows[0].contraseña_hash
    );
    if (!match) {
      return res.status(401).send("Auth failed");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE usuarios SET contraseña_hash = $1 WHERE usuario_id = $2",
      [hashedNewPassword, userId]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

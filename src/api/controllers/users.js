const pool = require("../../config/db");
const bcrypt = require("bcrypt");

// Obtener a todos los usuarios registrados
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT usuario_id, nombre, email, roles.nombre_rol AS rol, fecha_registro 
            FROM usuarios 
            JOIN roles ON usuarios.rol_id = roles.rol_id
        `);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener usuarios por su Id
exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await pool.query(
      `
            SELECT usuario_id, nombre, email, roles.nombre_rol AS rol, fecha_registro 
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

// Actualizar usuarios
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { nombre, email, rol, password } = req.body;
    let updatedUser;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updatedUser = await pool.query(
        `UPDATE usuarios 
                 SET nombre = $1, email = $2, rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = $3), contraseña_hash = $4 
                 WHERE usuario_id = $5 
                 RETURNING *`,
        [nombre, email, rol, hashedPassword, userId]
      );
    } else {
      updatedUser = await pool.query(
        `UPDATE usuarios 
                 SET nombre = $1, email = $2, rol_id = (SELECT rol_id FROM roles WHERE nombre_rol = $3) 
                 WHERE usuario_id = $4 
                 RETURNING *`,
        [nombre, email, rol, userId]
      );
    }

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar usuarios
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await pool.query(
      "DELETE FROM usuarios WHERE usuario_id = $1 RETURNING *",
      [userId]
    );
    if (deletedUser.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({
        message: "User deleted successfully",
        user: deletedUser.rows[0],
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Agregar un nuevo usuario
exports.addUser = async (req, res) => {
  try {
    const { nombre, email, rol, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      `INSERT INTO usuarios (nombre, email, contraseña_hash, rol_id) 
             VALUES ($1, $2, $3, (SELECT rol_id FROM roles WHERE nombre_rol = $4)) 
             RETURNING *`,
      [nombre, email, hashedPassword, rol]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buscar usuarios por nombre y rol
exports.searchUsers = async (req, res) => {
  try {
    const { nombre, rol } = req.query;
    let query = `
            SELECT usuario_id, nombre, email, roles.nombre_rol AS rol, fecha_registro 
            FROM usuarios 
            JOIN roles ON usuarios.rol_id = roles.rol_id
    `;
    let values = [];
    let conditions = [];

    if (nombre) {
      conditions.push("nombre ILIKE $1");
      values.push(`%${nombre}%`);
    }
    if (rol) {
      conditions.push("roles.nombre_rol ILIKE $" + (values.length + 1));
      values.push(`%${rol}%`);
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

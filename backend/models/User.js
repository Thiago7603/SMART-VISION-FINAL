// backend/models/User.js
const db = require('../config/db');

const User = {
  async create(name, email, password, gender) {
    const query = `
      INSERT INTO users(name, email, password, gender, role) 
      VALUES($1, $2, $3, $4, $5) 
      RETURNING id, name, email, gender, role, created_at
    `;
    const values = [name, email, password, gender, 'user']; // Asignar rol por defecto como 'user'
    const { rows } = await db.query(query, values);
    console.log('Resultado de INSERT:', rows);
    return rows[0];
  },

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },

  // Otros métodos según necesites
};

module.exports = User;
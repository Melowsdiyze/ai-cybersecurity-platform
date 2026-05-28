const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database/cybersecurity.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Sessions table - stores chat history per session
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Messages table - stores individual messages
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      )
    `);

    // Knowledge base - stores AI training data
    db.run(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        user_id INTEGER,
        tool_used TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tools usage history
    db.run(`
      CREATE TABLE IF NOT EXISTS tool_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        tool_category TEXT NOT NULL,
        input_data TEXT,
        output_data TEXT,
        success BOOLEAN DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create default admin user
    const defaultEmail = 'admin@melodys.ctf';
    const defaultPassword = 'YOUR_SERVER_PASSWORD';
    const defaultRole = 'Bug Hunter';

    db.get('SELECT * FROM users WHERE email = ?', [defaultEmail], (err, row) => {
      if (!row) {
        bcrypt.hash(defaultPassword, 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return;
          }
          db.run(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [defaultEmail, hash, defaultRole],
            (err) => {
              if (err) {
                console.error('Error creating default user:', err);
              } else {
                console.log('Default admin user created successfully');
              }
            }
          );
        });
      }
    });
  });
}

// User operations
const userOps = {
  create: (email, password, role, callback) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return callback(err);
      db.run(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hash, role],
        callback
      );
    });
  },

  findByEmail: (email, callback) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  },

  updateLastLogin: (userId, callback) => {
    db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId],
      callback
    );
  },

  verifyPassword: (plainPassword, hashedPassword, callback) => {
    bcrypt.compare(plainPassword, hashedPassword, callback);
  }
};

// Session operations
const sessionOps = {
  create: (userId, sessionId, callback) => {
    db.run(
      'INSERT INTO sessions (user_id, session_id) VALUES (?, ?)',
      [userId, sessionId],
      callback
    );
  },

  updateActivity: (sessionId, callback) => {
    db.run(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId],
      callback
    );
  },

  getBySessionId: (sessionId, callback) => {
    db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId], callback);
  },

  getHistory: (sessionId, limit = 50, callback) => {
    db.all(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?',
      [sessionId, limit],
      callback
    );
  }
};

// Message operations
const messageOps = {
  add: (sessionId, role, content, callback) => {
    db.run(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, role, content],
      callback
    );
  },

  getSessionMessages: (sessionId, callback) => {
    db.all(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId],
      callback
    );
  }
};

// Knowledge base operations
const knowledgeOps = {
  add: (category, question, answer, userId, toolUsed, tags, callback) => {
    db.run(
      'INSERT INTO knowledge_base (category, question, answer, user_id, tool_used, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [category, question, answer, userId, toolUsed, tags],
      callback
    );
  },

  search: (query, category = null, callback) => {
    let sql = 'SELECT * FROM knowledge_base WHERE question LIKE ? OR answer LIKE ?';
    let params = [`%${query}%`, `%${query}%`];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC LIMIT 20';
    db.all(sql, params, callback);
  },

  getRecent: (limit = 100, callback) => {
    db.all(
      'SELECT * FROM knowledge_base ORDER BY created_at DESC LIMIT ?',
      [limit],
      callback
    );
  },

  getByCategory: (category, callback) => {
    db.all(
      'SELECT * FROM knowledge_base WHERE category = ? ORDER BY created_at DESC',
      [category],
      callback
    );
  }
};

// Tool history operations
const toolOps = {
  add: (userId, toolName, toolCategory, inputData, outputData, success, callback) => {
    db.run(
      'INSERT INTO tool_history (user_id, tool_name, tool_category, input_data, output_data, success) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, toolName, toolCategory, inputData, outputData, success],
      callback
    );
  },

  getByUser: (userId, limit = 50, callback) => {
    db.all(
      'SELECT * FROM tool_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit],
      callback
    );
  },

  getByCategory: (userId, category, callback) => {
    db.all(
      'SELECT * FROM tool_history WHERE user_id = ? AND tool_category = ? ORDER BY timestamp DESC',
      [userId, category],
      callback
    );
  }
};

module.exports = {
  db,
  initializeDatabase,
  userOps,
  sessionOps,
  messageOps,
  knowledgeOps,
  toolOps
};

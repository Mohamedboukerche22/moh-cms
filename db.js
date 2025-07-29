const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS test_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER,
        input TEXT,
        output TEXT,
        FOREIGN KEY (problem_id) REFERENCES problems(id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        problem_id INTEGER,
        code TEXT,
        status TEXT,
        score INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (problem_id) REFERENCES problems(id)
    )`);

    // Insert sample problems and test cases
    db.run(`INSERT OR IGNORE INTO problems (id, title, description) VALUES
        (1, 'Hello World', 'Write a program that prints "Hello, World!" to the console.'),
        (2, 'Sum of Array', 'Write a program that calculates the sum of an array of integers.')
    `);
    db.run(`INSERT OR IGNORE INTO test_cases (problem_id, input, output) VALUES
        (1, '', 'Hello, World!'),
        (2, '3\n1 2 3', '6'),
        (2, '4\n-1 0 1 2', '2')
    `);

    // Insert admin user
    const adminUsername = 'admin';
    const adminPassword = 'hakimthemathking';
    bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            return;
        }
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, 
            [adminUsername, hashedPassword, 'admin'], 
            (err) => {
                if (err) {
                    console.error('Error inserting admin user:', err);
                } else {
                    console.log('Admin user created successfully');
                }
            });
    });
});

module.exports = db;
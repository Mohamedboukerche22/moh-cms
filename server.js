const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const { evaluateSubmission } = require('./judge');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err || !user) {
                return res.redirect('/login');
            }
            req.user = user;
            next();
        });
    } else {
        res.redirect('/login');
    }
};

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Access denied');
    }
};

// Routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
            [username, hashedPassword, 'user'], (err) => {
                if (err) {
                    res.render('register', { error: 'Username already exists' });
                } else {
                    res.redirect('/login');
                }
            });
    } catch (error) {
        res.render('register', { error: 'Registration failed' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            res.render('login', { error: 'Invalid credentials' });
        } else {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.userId = user.id;
                res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
            } else {
                res.render('login', { error: 'Invalid credentials' });
            }
        }
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM problems', (err, problems) => {
        res.render('dashboard', { problems, user: req.user });
    });
});

app.get('/problem/:id', isAuthenticated, (req, res) => {
    const problemId = req.params.id;
    db.get('SELECT * FROM problems WHERE id = ?', [problemId], (err, problem) => {
        if (err || !problem) {
            res.status(404).send('Problem not found');
        } else {
            res.render('problem', { problem, user: req.user });
        }
    });
});

app.get('/submit/:id', isAuthenticated, (req, res) => {
    const problemId = req.params.id;
    db.get('SELECT * FROM problems WHERE id = ?', [problemId], (err, problem) => {
        if (err || !problem) {
            res.status(404).send('Problem not found');
        } else {
            res.render('submit', { problemId, problem });
        }
    });
});

app.post('/submit/:id', isAuthenticated, async (req, res) => {
    const problemId = req.params.id;
    const { code } = req.body;
    try {
        const result = await evaluateSubmission(code, problemId);
        db.run('INSERT INTO submissions (user_id, problem_id, code, status, score) VALUES (?, ?, ?, ?, ?)', 
            [req.session.userId, problemId, code, result.status, result.score], 
            (err) => {
                if (err) {
                    res.status(500).send('Database error');
                } else {
                    res.redirect(`/problem/${problemId}`);
                }
            });
    } catch (error) {
        res.status(500).send('Evaluation error');
    }
});

app.get('/submissions', isAuthenticated, (req, res) => {
    db.all('SELECT s.*, p.title FROM submissions s JOIN problems p ON s.problem_id = p.id WHERE s.user_id = ?', 
        [req.session.userId], (err, submissions) => {
            res.render('submissions', { submissions, user: req.user });
        });
});

app.get('/admin/dashboard', isAuthenticated, isAdmin, (req, res) => {
    db.all('SELECT s.*, u.username, p.title FROM submissions s JOIN users u ON s.user_id = u.id JOIN problems p ON s.problem_id = p.id', 
        (err, submissions) => {
            res.render('admin_dashboard', { submissions, user: req.user });
        });
});

app.get('/admin/add-problem', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin_add_problem', { error: null, user: req.user });
});

app.post('/admin/add-problem', isAuthenticated, isAdmin, (req, res) => {
    const { title, description, test_cases } = req.body;
    try {
        const testCases = JSON.parse(test_cases);
        db.run('INSERT INTO problems (title, description) VALUES (?, ?)', [title, description], function(err) {
            if (err) {
                return res.render('admin_add_problem', { error: 'Failed to add problem', user: req.user });
            }
            const problemId = this.lastID;
            testCases.forEach(tc => {
                db.run('INSERT INTO test_cases (problem_id, input, output) VALUES (?, ?, ?)', 
                    [problemId, tc.input, tc.output]);
            });
            res.redirect('/admin/dashboard');
        });
    } catch (error) {
        res.render('admin_add_problem', { error: 'Invalid test cases format', user: req.user });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.listen(3000, () => console.log('Server running on port 3000'));
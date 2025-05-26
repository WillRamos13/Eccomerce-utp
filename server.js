const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;  // Para que funcione en Render

// Usuarios hardcodeados
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'cliente', password: 'cliente123', role: 'client' },
];

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'mi_secreto_super_seguro',
        resave: false,
        saveUninitialized: false,
    })
);

app.use(express.static(path.join(__dirname, 'public')));

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        req.session.user = { username: user.username, role: user.role };
        return res.json({ message: 'Login exitoso', role: user.role });
    } else {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }
});

// Middleware para proteger rutas según rol
function authRole(role) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role === role) {
            next();
        } else {
            res.redirect('/login.html');
        }
    };
}

// Rutas protegidas
app.get('/admin.html', authRole('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/client.html', authRole('client'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});

const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'cliente', password: 'cliente123', role: 'client' },
];

// Productos almacenados en memoria (para ejemplo simple)
let productos = [];

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

app.get('/admin.html', authRole('admin'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/cliente.html', authRole('client'), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cliente.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// Socket.IO comunicación
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Cuando un cliente (cliente.html) se conecta, le enviamos la lista actual de productos
    socket.emit('productosActualizados', productos);

    // Escuchamos cuando admin agrega un producto
    socket.on('nuevoProducto', (producto) => {
        productos.push(producto);
        // Enviar la lista actualizada a todos los clientes conectados
        io.emit('productosActualizados', productos);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});

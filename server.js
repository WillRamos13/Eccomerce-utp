const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Ahora usuarios con fullname
const users = [
    { username: 'admin', password: 'admin123', role: 'admin', fullname: 'Administrador Principal' },
    { username: 'cliente', password: 'cliente123', role: 'client', fullname: 'Cliente Ejemplo' },
];

// Productos y pedidos en memoria
let productos = [];
let pedidos = [];

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

// Registro de usuarios (simplificado, sin persistencia real)
app.post('/register', (req, res) => {
    const { username, password, fullname } = req.body;

    // Verificar si el username existe
    const existe = users.some(u => u.username === username);
    if (existe) {
        return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Agregar nuevo usuario con rol cliente por defecto
    users.push({ username, password, fullname, role: 'client' });

    res.json({ message: 'Registro exitoso, ya puede iniciar sesión' });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        // Guardar usuario con fullname en sesión
        req.session.user = {
            username: user.username,
            role: user.role,
            fullname: user.fullname,
        };
        return res.json({ message: 'Login exitoso', role: user.role, fullname: user.fullname });
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

    // Enviar lista actual de productos y pedidos al conectar
    socket.emit('productosActualizados', productos);
    socket.emit('pedidosActualizados', pedidos);

    socket.on('nuevoProducto', (producto) => {
        productos.push(producto);
        io.emit('productosActualizados', productos);
    });

    socket.on('eliminarProducto', (index) => {
        if (index >= 0 && index < productos.length) {
            productos.splice(index, 1);
            io.emit('productosActualizados', productos);
        }
    });

    socket.on('nuevoPedido', (pedido) => {
        pedidos.push(pedido);
        io.emit('pedidosActualizados', pedidos);
    });

    socket.on('cambiarEstadoPedido', ({ index, estado }) => {
        if (index >= 0 && index < pedidos.length) {
            pedidos[index].estado = estado;
            io.emit('pedidosActualizados', pedidos);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});

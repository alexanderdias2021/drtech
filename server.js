const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'base_tech'
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
    } else {
        console.log('Conectado a MySQL ✅');
    }
});

app.post('/registrar', (req, res) => {
    const { cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad, id} = req.body;

    const sql = `INSERT INTO clientes 
                 (cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad, id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad, id], (err, result) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});
app.get('/productos', (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            res.json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});
app.post('/comprar', (req, res) => {
    const { cedula, items } = req.body;

    if (!items || items.length === 0) {
        return res.json({ success: false, error: 'Carrito vacío' });
    }

    const valores = items.map(item => [
        cedula,
        item.codigo,
        item.productos,
        item.precio,
        item.qty
    ]);

    const sql = `INSERT INTO compras (cedula, codigo, producto, precio, cantidad) VALUES ?`;

    db.query(sql, [valores], (err, result) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});
app.get('/verificar-cliente/:cedula', (req, res) => {
    const { cedula } = req.params;
    db.query('SELECT cedula FROM clientes WHERE cedula = ?', [cedula], (err, results) => {
        if (err) {
            res.json({ existe: false });
        } else {
            res.json({ existe: results.length > 0 });
        }
    });
});
app.get('/reporte/diario', (req, res) => {
    const sql = `
        SELECT 
            c.codigo,
            c.producto,
            c.precio,
            c.cantidad,
            c.cedula,
            cl.nombre,
            cl.telefono,
            DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') as fecha
        FROM compras c
        LEFT JOIN clientes cl ON c.cedula = cl.cedula
        WHERE DATE(c.fecha) = CURDATE()
        ORDER BY c.fecha DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});
app.get('/reporte/mensual', (req, res) => {
    const sql = `
        SELECT 
            c.codigo,
            c.producto,
            c.precio,
            c.cantidad,
            c.cedula,
            cl.nombre,
            cl.telefono,
            DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') as fecha
        FROM compras c
        LEFT JOIN clientes cl ON c.cedula = cl.cedula
        WHERE MONTH(c.fecha) = MONTH(CURDATE())
        AND YEAR(c.fecha) = YEAR(CURDATE())
        ORDER BY c.fecha DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});
app.get('/reporte/resumen', (req, res) => {
    const sql = `
        SELECT 
            producto,
            codigo,
            SUM(cantidad) as total_vendido,
            SUM(precio * cantidad) as total_ingresos,
            COUNT(*) as num_ventas
        FROM compras
        WHERE MONTH(fecha) = MONTH(CURDATE())
        AND YEAR(fecha) = YEAR(CURDATE())
        GROUP BY codigo, producto
        ORDER BY total_ingresos DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});
app.listen(3000, () => {
    console.log('Servidor corriendo en https://romantic-joy-production-c58c.up.railway.app ✅');
});
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'base_tech',
    port: process.env.DB_PORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
    } else {
        console.log('Conectado a MySQL ✅');
    }
});

app.post('/registrar', (req, res) => {
    const { cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad } = req.body;
    const sql = `INSERT INTO clientes 
                 (cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [cedula, nombre, usuario, correo, contraseña, telefono, direccion, ciudad], (err, result) => {
        if (err) res.json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

// Verificar cliente
app.get('/verificar-cliente/:cedula', (req, res) => {
    const { cedula } = req.params;
    db.query('SELECT cedula FROM clientes WHERE cedula = ?', [cedula], (err, results) => {
        if (err) res.json({ existe: false });
        else res.json({ existe: results.length > 0 });
    });
});

// Obtener todos los productos
app.get('/productos', (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});

// Obtener producto por código
app.get('/productos/:codigo', (req, res) => {
    const { codigo } = req.params;
    db.query('SELECT * FROM productos WHERE codigo = ?', [codigo], (err, results) => {
        if (err) res.json({ error: err.message });
        else if (results.length === 0) res.json({ error: 'Producto no encontrado' });
        else res.json(results[0]);
    });
});

// Registrar compra
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
            return res.json({ success: false, error: err.message });
        }

        let pendientes = items.length;
        let huboError = false;

        items.forEach(item => {
            const sqlStock = `UPDATE productos SET cantidad = cantidad - ? WHERE codigo = ?`;
            db.query(sqlStock, [item.qty, item.codigo], (errStock) => {
                if (errStock) huboError = true;
                pendientes--;
                if (pendientes === 0) {
                    res.json({ success: true });
                }
            });
        });
    });
});

// Reporte diario ventas
app.get('/reporte/diario', (req, res) => {
    const sql = `
        SELECT c.codigo, c.producto, c.precio, c.cantidad, c.cedula,
               cl.nombre, cl.telefono,
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

// Reporte mensual ventas
app.get('/reporte/mensual', (req, res) => {
    const sql = `
        SELECT c.codigo, c.producto, c.precio, c.cantidad, c.cedula,
               cl.nombre, cl.telefono,
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

// Resumen ventas por producto
app.get('/reporte/resumen', (req, res) => {
    const sql = `
        SELECT producto, codigo,
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

// Obtener servicios técnicos
app.get('/servicios', (req, res) => {
    const sql = `
        SELECT s.*, c.nombre, c.telefono 
        FROM servicio_tecnico s
        LEFT JOIN clientes c ON s.cedulaserv = c.cedula
        ORDER BY s.fechain DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});

// Registrar servicio técnico
app.post('/servicios/registrar', (req, res) => {
    const { codigo, problema, fechain, fechasal, marca, modelo, cedulaserv } = req.body;
    const sql = `INSERT INTO servicio_tecnico 
                 (codigo, problema, fechain, fechasal, marca, modelo, cedulaserv) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [codigo, problema, fechain, fechasal, marca, modelo, cedulaserv], (err, result) => {
        if (err) res.json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

// Actualizar servicio técnico
app.put('/servicios/actualizar/:codigo', (req, res) => {
    const { fechasal, problema } = req.body;
    const { codigo } = req.params;
    const sql = `UPDATE servicio_tecnico SET fechasal = ?, problema = ? WHERE codigo = ?`;
    db.query(sql, [fechasal, problema, codigo], (err, result) => {
        if (err) res.json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

// Eliminar servicio técnico
app.delete('/servicios/eliminar/:codigo', (req, res) => {
    const { codigo } = req.params;
    db.query('DELETE FROM servicio_tecnico WHERE codigo = ?', [codigo], (err, result) => {
        if (err) res.json({ success: false, error: err.message });
        else res.json({ success: true });
    });
});

// Reporte diario servicio técnico
app.get('/reporte/servicios/diario', (req, res) => {
    const sql = `
        SELECT s.*, c.nombre, c.telefono
        FROM servicio_tecnico s
        LEFT JOIN clientes c ON s.cedulaserv = c.cedula
        WHERE s.fechain = CURDATE()
        ORDER BY s.fechain DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});

// Reporte mensual servicio técnico
app.get('/reporte/servicios/mensual', (req, res) => {
    const sql = `
        SELECT s.*, c.nombre, c.telefono
        FROM servicio_tecnico s
        LEFT JOIN clientes c ON s.cedulaserv = c.cedula
        WHERE MONTH(s.fechain) = MONTH(CURDATE())
        AND YEAR(s.fechain) = YEAR(CURDATE())
        ORDER BY s.fechain DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});

// Resumen servicio técnico por equipo
app.get('/reporte/servicios/resumen', (req, res) => {
    const sql = `
        SELECT marca, modelo,
               COUNT(*) as total,
               SUM(CASE WHEN fechasal IS NOT NULL THEN 1 ELSE 0 END) as listos,
               SUM(CASE WHEN fechasal IS NULL THEN 1 ELSE 0 END) as en_proceso
        FROM servicio_tecnico
        GROUP BY marca, modelo
        ORDER BY total DESC
    `;
    db.query(sql, (err, results) => {
        if (err) res.json({ error: err.message });
        else res.json(results);
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 3000} ✅`);
});
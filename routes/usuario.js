const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const enviarCorreo = require('../services/enviarCorreo'); // Función para enviar correos
const bcrypt = require('bcrypt');
const verifyToken = require("../middlewares/verifyToken");
const nodemailer = require('nodemailer');

//require('dotenv').config({ path: 'db.env' });


const SECRET_KEY = process.env.JWT_SECRET/*  || "secretkeygoe" */;
// Cambiar a 15 minutos (o el tiempo deseado)
const JWT_OPTIONS = { expiresIn: "15m" };
const DOMINIO_VALIDO = '@ctjfr.edu.co';

// Añadir endpoint para refrescar token
router.post("/refresh", verifyToken, (req, res) => {
    const u = req.user;

    // Crear nuevo token con el mismo payload
    const newToken = jwt.sign(
        { documento: u.documento, email: u.email, id_rol: u.id_rol },
        SECRET_KEY,
        JWT_OPTIONS
    );

    res.json({
        success: true,
        token: newToken
    });
});

// Obtener todos los usuarios
router.get("/", async (req, res) => {
    try {
        const usuarios = await db.query("SELECT * FROM usuario");
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error: error.message,
        });
    }
});

//estudiantes a cargo de un docente
router.get("/estudiantes/:curso", async (req, res) => {
    try {
        const usuarios = await db.query("SELECT * FROM usuario WHERE id_rol=101 AND grado = ?", [req.params.curso]);
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error: error.message,
        });
    }
});

router.get("/students", async (req, res) => {
    try {
        const usuarios = await db.query("SELECT usuario.*, directorio.id_detalle, directorio.rh_estudiante, directorio.eps, directorio.fecha_naci, directorio.enfermedades, directorio.nom_acu, directorio.telefono_acu, directorio.doc_acu, directorio.email_acu FROM usuario LEFT JOIN directorio ON usuario.documento=directorio.documento WHERE id_rol=101", [req.params.curso]);
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error: error.message,
        });
    }
});

router.get("/materias/:documento", async (req, res) => {
    try {
        const usuarios = await db.query("SELECT usuario.documento, materia.nomb_mat, materia.idmat FROM usuario INNER JOIN profesor_materia ON usuario.documento=profesor_materia.documento INNER JOIN materia ON profesor_materia.idMat=materia.idmat WHERE usuario.documento=?", [req.params.documento]);
        if (usuarios.length === 0) {
            return res.status(404).json({ success: false, message: "No se encontraron usuarios para esta materia" });
        }
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener usuarios",
            error: error.message,
        });
    }
});

// Obtener un usuario por documento
router.get("/:documento", async (req, res) => {
    try {
        const { documento } = req.params;
        const resultado = await db.query(
            "SELECT *, AES_DECRYPT(clave, 'SENA') AS pass FROM usuario WHERE documento = ?",
            [documento]
        );

        if (resultado.length === 0) {
            return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        const usuario = resultado[0];
        if (usuario.pass && Buffer.isBuffer(usuario.pass)) {
            usuario.pass = usuario.pass.toString("utf8");
        }

        res.json({ success: true, data: usuario });
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener usuario",
            error: error.message,
        });
    }
});

// Iniciar sesión
router.post("/login", async (req, res) => {
    const { email, clave } = req.body;
    if (!email || !clave) {
        return res.status(400).json({ success: false, message: "Email y clave son requeridos" });
    }

    try {
        const query = `
      SELECT  
        documento, email, nombre1, nombre2, apellido1, apellido2,
        telefono, direccion, grado, id_rol, foto,
        AES_DECRYPT(clave, 'SENA') AS clave_desencriptada
      FROM usuario 
      WHERE email = ?`;
        const [usuarios] = await db.query(query, [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ success: false, message: "El correo no está registrado" });
        }

        const u = usuarios[0];
        const claveDesencriptada = u.clave_desencriptada?.toString("utf8") || "";
        if (clave !== claveDesencriptada) {
            return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
        }

        const userResponse = {
            documento: u.documento,
            email: u.email,
            nombre1: u.nombre1,
            nombre2: u.nombre2,
            apellido1: u.apellido1,
            apellido2: u.apellido2,
            telefono: u.telefono,
            direccion: u.direccion,
            grado: u.grado,
            id_rol: u.id_rol,
            foto: u.foto
        };

        // Crear token JWT con expiresIn
        const token = jwt.sign(
            { documento: u.documento, email: u.email, id_rol: u.id_rol },
            SECRET_KEY,
            JWT_OPTIONS
        );

        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({
            success: false,
            message: "Error al iniciar sesión",
            error: err.message
        });
    }
});

// Verificar token y refrescar datos
router.post('/verify', verifyToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});


// Perfil del usuario
router.get("/perfil", verifyToken, async (req, res) => {
    try {
        // Ya tenemos todos los datos del usuario en req.user gracias al middleware
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error("Error en /perfil:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener perfil",
            error: error.message
        });
    }
});

// Crear un nuevo usuario
router.post('/', async (req, res) => {
    const {
        documento,
        email,
        clave,
        id_rol,
        tipo_doc,
        nombre1,
        nombre2,
        apellido1,
        apellido2,
        telefono,
        direccion,
        grado
    } = req.body;

    try {
        // Validar dominio institucional
        if (!email.endsWith(DOMINIO_VALIDO)) {
            return res.status(400).json({ message: 'El correo debe ser institucional (@ctjfr.edu.co)' });
        }

        // Verificar si el correo o documento ya existen
        const [usuarios] = await db.query(
            'SELECT COUNT(*) AS total FROM usuario WHERE email = ? OR documento = ?',
            [email, documento]
        );

        if (usuarios[0].total > 0) {
            return res.status(409).json({ message: 'El correo o documento ya está registrado.' });
        }

        // Generar token y encriptar clave
        const token = crypto.randomBytes(10).toString('hex');
        const claveHash = await bcrypt.hash(clave, 10);
        const foto = 'user.png';

        // Insertar nuevo usuario
        await db.query(
            `INSERT INTO usuario (
        documento, id_rol, email, clave, tipo_doc, nombre1, nombre2,
        apellido1, apellido2, telefono, direccion, foto, grado, activo, token_activacion
        ) VALUES (?, ?, ?, aes_encrypt(?,'SENA'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                documento, id_rol, email, clave, tipo_doc, nombre1, nombre2,
                apellido1, apellido2, telefono, direccion, foto, grado || null, 0, token
            ]
        );

        await db.query(
            'INSERT INTO directorio (id_detalle, documento) VALUES (?, ?)',
            [documento, documento]
        );

        // Preparar email de activación
        const enlace = `http://localhost/goes/activar.php?token=${token}`;
        const asunto = '¡Activa tu cuenta en GOE!';
        const mensajeHTML = `
            <html>
            <head><title>Activación de Cuenta</title></head>
            <body>
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; background-color: #f9f9f9; padding: 20px;">
                <h2 style="color: #1E3A8A;">¡Bienvenido a GOE!</h2>
                <p>Gracias por registrarte. Haz clic en el siguiente botón para activar tu cuenta:</p>
                <p><a href="${enlace}" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 4px;">Activar Cuenta</a></p>
                <p>O copia y pega este enlace en tu navegador: <br><a href="${enlace}">${enlace}</a></p>
                <hr>
                <p style="font-size: 12px;">Si no solicitaste este registro, puedes ignorar este mensaje.</p>
                </div>
            </body>
            </html>
            `;

        const enviado = await enviarCorreo(email, asunto, mensajeHTML);
        if (!enviado) {
            return res.status(500).json({ message: 'Error al enviar el correo de activación.' });
        }

        res.status(201).json({ message: 'Usuario registrado. Revisa tu correo para activar tu cuenta.' });

    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { new_clave, confirm_clave } = req.body;

    if (!new_clave || !confirm_clave) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    if (new_clave !== confirm_clave) {
        return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
    }

    try {
        // Buscar usuario con token válido
        const [rows] = await db.query(
            `SELECT documento, AES_DECRYPT(clave, 'SENA') AS clave FROM usuario WHERE reset_token = ? AND token_expiration > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Token no válido o expirado.' });
        }

        const usuario = rows[0];

        const claveActual = usuario.clave.toString(); // Convertir Buffer a string

        if (new_clave === claveActual) {
            return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual.' });
        }

        // Verificar si la nueva contraseña es igual a la actual
        const esIgual = await bcrypt.compare(new_clave, claveActual);
        if (esIgual) {
            return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual.' });
        }

        // Hashear nueva contraseña
        const nuevaClaveHash = await bcrypt.hash(new_clave, 10);

        // Actualizar contraseña y limpiar token
        await db.query(
            `UPDATE usuario SET clave = AES_ENCRYPT(?, 'SENA'), reset_token = NULL, token_expiration = NULL, token_sesion = NULL WHERE documento = ?`,
            [new_clave, usuario.documento]
        );

        res.status(200).json({ message: 'Contraseña restablecida correctamente. Ahora puedes iniciar sesión.' });

    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

router.post('/recover-password', async (req, res) => {
    const { email } = req.body;

    try {
        const [rows] = await db.query('SELECT documento FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ status: 'orange', message: 'No se encontró una cuenta con ese correo electrónico.' });
        }

        const token = crypto.randomBytes(12).toString('hex');
        const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await db.query(
            'UPDATE usuario SET reset_token = ?, token_expiration = ? WHERE email = ?',
            [token, expira, email]
        );

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
        });

        const link = `http://localhost:3000/reset-password?token=${token}`; // ajusta el frontend URL si es necesario

        const htmlContent = `
            <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
            <h2 style="background-color: #1E3A8A; color: white; padding: 15px; border-radius: 10px 10px 0 0;">🔒 Restablecimiento de Contraseña</h2>
            <div style="padding: 20px; background: white;">
                <p>Hola,</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, puedes ignorar este mensaje.</p>
                <p>Haz clic en el botón para cambiar tu contraseña. Este enlace expirará en 1 hora.</p>
                <a href="${link}" style="display: inline-block; padding: 12px 25px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Restablecer Contraseña</a>
                <p style="margin-top: 20px;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                <p><a href="${link}">${link}</a></p>
                <p style="font-size: 12px; color: gray; margin-top: 30px;">© 2025 GOE - Plataforma Escolar.</p>
            </div>
            </div>
            `;

        await transporter.sendMail({
            from: `"GOE - Plataforma Escolar" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔑 Recuperación de contraseña - GOE',
            html: htmlContent,
        });

        res.status(200).json({ status: 'success', message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'No se pudo enviar el correo. Inténtalo más tarde.' });
    }
});

// Actualizar un usuario
router.put("/:documento", async (req, res) => {
    try {
        const { documento } = req.params;
        const campos = req.body;

        const keys = Object.keys(campos);
        const values = [];

        if (keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron campos para actualizar",
            });
        }

        const updateStr = keys.map(key => {
            if (key === "clave") {
                values.push(campos[key]);
                return `clave = AES_ENCRYPT(?, 'SENA')`;
            } else {
                values.push(campos[key]);
                return `${key} = ?`;
            }
        }).join(", ");

        const result = await db.query(
            `UPDATE usuario SET ${updateStr} WHERE documento = ?`,
            [...values, documento]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado",
            });
        }

        res.json({
            success: true,
            message: "Usuario actualizado correctamente",
            data: { documento },
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al actualizar usuario",
            error: error.message,
        });
    }
});

// Eliminar un usuario
router.delete("/:documento", async (req, res) => {
    try {
        const { documento } = req.params;

        const result = await db.query("DELETE FROM usuario WHERE documento = ?", [documento]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado",
            });
        }

        res.json({
            success: true,
            message: "Usuario eliminado correctamente",
        });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({
            success: false,
            message: "Error al eliminar usuario",
            error: error.message,
        });
    }
});

module.exports = router;

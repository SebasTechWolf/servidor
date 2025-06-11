const express = require("express");
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require("../config/db");
const verifyToken = require('../middlewares/verifyToken');

// Obtener todos los observadores
router.get("/", async (req, res) => {
    try {
        const observadores = await db.query("SELECT usuario.nombre1, usuario.nombre2, usuario.apellido1, usuario.apellido2, usuario.grado, observador.* FROM observador INNER JOIN usuario on usuario.documento = observador.documento");
        res.json({ success: true, data: observadores });
    } catch (error) {
        console.error("Error al obtener observadores:", error);
        res.status(500).json({ success: false, message: "Error al obtener observadores", error: error.message });
    }
});

router.get("/download/:documento", async (req, res) => {
    try {
        const { documento } = req.params;

        console.log("Documento recibido:", documento); // Verificación del parámetro

        if (!documento) {
            return res.status(400).json({
                success: false,
                message: "Documento no proporcionado"
            });
        }

        // Consulta SQL con JOIN entre las tres tablas
        const query = `
            SELECT 
                directorio.*,
                observador.idobservador,
                observador.fecha,
                observador.descripcion_falta,
                observador.compromiso,
                observador.firma,
                observador.seguimiento,
                observador.falta,
                observador.trimestre,
                usuario.nombre1,
                usuario.nombre2,
                usuario.apellido1,
                usuario.apellido2,
                usuario.grado,
                usuario.email,
                usuario.telefono,
                usuario.direccion
            FROM observador 
            RIGHT JOIN usuario ON usuario.documento = observador.documento
            INNER JOIN directorio ON directorio.documento = usuario.documento
            WHERE usuario.documento = ? OR observador.documento = ?
        `;

        const [rows] = await db.query(query, [documento, documento]);

        console.log("Resultado de la consulta:", rows); // Log para depuración

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron registros para el documento proporcionado",
                data: null
            });
        }

        if (rows.some(row => !row.id_detalle)) {
            return res.status(404).json({
                success: false,
                message: "Estudiante sin directorio",
                data: null
            })
        }

        // Procesar los resultados
        const resultados = rows.map(row => ({
            usuario: {
                nombreCompleto: `${row.nombre1 || ''} ${row.nombre2 || ''} ${row.apellido1 || ''} ${row.apellido2 || ''}`.trim(),
                grado: row.grado || null,
                email: row.email || null,
                telefono: row.telefono || null,
                direccion: row.direccion || null,
                id_detalle: row.id_detalle || null,
                documento: row.documento || null,
                rh_esudiante: row.rh_estudiante || null,
                eps: row.eps || null,
                fecha_naci: row.fecha_naci || null,
                enfermedades: row.enfermedades || null,
                nom_acu: row.nom_acu || null,
                tel_acu: row.telefono_acu || null,
                doc_acu: row.doc_acu || null,
                email_acu: row.email_acu || null,
            },
            observador: {
                idobservador: row.idobservador || null,
                fecha: row.fecha || null,
                descripcion_falta: row.descripcion_falta || "Sin descripción",
                compromiso: row.compromiso || "Sin compromiso",
                firma: row.firma || null,
                docente: row.seguimiento || "Sin seguimiento",
                falta: row.falta || "Leve",
                trimestre: row.trimestre || "I"
            }
        }));

        res.json({
            success: true,
            message: "Datos obtenidos correctamente",
            data: resultados
        });

    } catch (error) {
        console.error("Error en /por-documento/:documento:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener los datos",
            error: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

router.get('/api/cursos/:id_docente', async (req, res) => {
    const [rows] = await db.query('SELECT id, nombre FROM curso WHERE docente_id = ?', [req.params.id_docente]);
    res.json(rows);
});

router.get('/api/estudiantes/curso/:id_curso', async (req, res) => {
    const [rows] = await db.query('SELECT id, nombre FROM estudiante WHERE curso_id = ?', [req.params.id_curso]);
    res.json(rows);
});


// Obtener observador por ID
router.get("/observacion/:idobservador", async (req, res) => {
    try {
        const { idobservador } = req.params;

        console.log("ID recibido:", idobservador); // Verifica que el ID sea correcto

        if (!idobservador || isNaN(Number(idobservador))) {
            return res.status(400).json({
                success: false,
                message: "ID de observador inválido"
            });
        }

        // Consulta SQL mejorada con alias y JOIN explícito
        const query = `
            SELECT 
                obs.idobservador,
                obs.documento,
                obs.fecha,
                obs.descripcion_falta,
                obs.compromiso,
                obs.firma,
                obs.seguimiento,
                obs.falta,
                obs.trimestre,
                u.nombre1,
                u.nombre2,
                u.apellido1,
                u.apellido2
            FROM observador AS obs
            INNER JOIN usuario AS u ON u.documento = obs.documento
            WHERE obs.idobservador = ?
        `;

        const [rows] = await db.query(query, [idobservador]); // Usar destructuring para MySQL2

        console.log("Resultado de la consulta:", rows); // Verifica qué devuelve la consulta

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No se encontró el observador con el ID proporcionado",
                data: null
            });
        }

        const observador = rows[0];

        // Asegurar que los campos no sean undefined
        const responseData = {
            idobservador: observador.idobservador || null,
            documento: observador.documento || null,
            fecha: observador.fecha || null,
            descripcion_falta: observador.descripcion_falta || "Sin descripción",
            compromiso: observador.compromiso || "Sin compromiso",
            firma: observador.firma || null,
            seguimiento: observador.seguimiento || "Sin seguimiento",
            falta: observador.falta || "Leve",
            trimestre: observador.trimestre || "I",
            nombre1: observador.nombre1 || "",
            nombre2: observador.nombre2 || "",
            apellido1: observador.apellido1 || "",
            apellido2: observador.apellido2 || ""
        };

        res.json({
            success: true,
            message: "Observador obtenido correctamente",
            data: responseData
        });

    } catch (error) {
        console.error("Error en /observacion/:idobservador:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener el observador",
            error: error.message
        });
    }
});

// Obtener observador por ID (solo para usuarios logueados)
router.get("/estudiante/:idobservador", async (req, res) => {
    try {
        const { idobservador } = req.params;
        const result = await db.query("SELECT observador.*, usuario.nombre1, usuario.nombre2, usuario.apellido1, usuario.apellido2 FROM observador LEFT JOIN usuario on usuario.documento = observador.documento WHERE observador.documento = ?", [idobservador]);

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Observador no encontrado" });
        }

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error("Error al obtener observador:", error);
        res.status(500).json({ success: false, message: "Error al obtener observador", error: error.message });
    }
});

// Obtener todos los registros del observador (solo para usuarios logueados)
router.get("/", verifyToken, async (req, res) => {
    try {
        const rows = await db.query("SELECT usuario.nombre1, usuario.nombre2, usuario.apellido1, usuario.apellido2, observador.* FROM observador INNER JOIN usuario on usuario.documento = observador.documento WHERE observador.documento = ?", [req.user.documento])
        res.json({ success: true, data: rows })
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener datos del observador", error: error.message })
    }
})

// Crear nueva observación
router.post("/", verifyToken, async (req, res) => {
    try {
        console.log("Iniciando creación de observación...");

        // Validación de campos requeridos
        const requiredFields = {
            documento: "number",              // int(11)
            fecha: "string",                  // date (formato 'YYYY-MM-DD')
            descripcion_falta: "string",      // varchar(100)
            compromiso: "string",             // varchar(55)
            seguimiento: "string",            // varchar(30)
            falta: "string",                  // varchar(255) (puede ser 'Leve', 'Regular', etc.)
            trimestre: "string"               // I, II, III, IV
        };

        const errors = [];
        for (const [field, type] of Object.entries(requiredFields)) {
            if (!req.body[field]) {
                errors.push(`El campo '${field}' es requerido`);
            } else if (typeof req.body[field] !== type) {
                errors.push(`El campo '${field}' debe ser de tipo '${type}'`);
            }
        }

        if (errors.length > 0) {
            console.error("Errores de validación:", errors);
            return res.status(400).json({
                success: false,
                message: "Errores de validación",
                errors,
            });
        }

        // Preparar datos para la inserción
        const {
            documento,
            fecha,
            descripcion_falta,
            compromiso,
            firma = null,            // opcional
            seguimiento,
            falta = null,            // opcional
            trimestre
        } = req.body;

        const formattedDate = new Date(fecha).toISOString().split("T")[0];

        const [result] = await db.query(
            `INSERT INTO observador 
        (documento, fecha, descripcion_falta, compromiso, firma, seguimiento, falta, trimestre)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                documento,
                formattedDate,
                descripcion_falta,
                compromiso,
                firma,
                seguimiento,
                falta,
                trimestre
            ]
        );

        console.log("Resultado de la inserción:", result);

        const [observacionCreada] = await db.query(
            "SELECT * FROM observador WHERE idobservador = ?",
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Observación creada exitosamente",
            data: observacionCreada[0],
        });

    } catch (error) {
        console.error("Error en creación de observación:", {
            message: error.message,
            stack: error.stack,
            sqlMessage: error.sqlMessage || null,
            code: error.code || null
        });

        return res.status(500).json({
            success: false,
            message: "Error interno al crear la observación",
            error: process.env.NODE_ENV === "development" ? error.message : null
        });
    }
});

// Actualizar observador
router.put("/:idobservador", async (req, res) => {
    try {
        const { idobservador } = req.params;
        const campos = req.body;

        const keys = Object.keys(campos);
        const values = Object.values(campos);

        const updateStr = keys.map(k => `${k} = ?`).join(", ");
        const result = await db.query(
            `UPDATE observador SET ${updateStr} WHERE idobservador = ?`,
            [...values, idobservador]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Observador no encontrado" });
        }

        res.json({ success: true, message: "Observador actualizado", data: { idobservador } });
    } catch (error) {
        console.error("Error al actualizar observador:", error);
        res.status(500).json({ success: false, message: "Error al actualizar observador", error: error.message });
    }
});

// Eliminar observador
router.delete("/:idobservador", async (req, res) => {
    try {
        const { idobservador } = req.params;
        const result = await db.query("DELETE FROM observador WHERE idobservador = ?", [idobservador]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Observador no encontrado" });
        }

        res.json({ success: true, message: "Observador eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar observador:", error);
        res.status(500).json({ success: false, message: "Error al eliminar observador", error: error.message });
    }
});

const obtenerObservadorPorDocumento = async (documento) => {
    const query = `
        SELECT 
            directorio.*,
            observador.idobservador,
            observador.fecha,
            observador.descripcion_falta,
            observador.compromiso,
            observador.firma,
            observador.seguimiento,
            observador.falta,
            observador.trimestre,
            usuario.nombre1,
            usuario.nombre2,
            usuario.apellido1,
            usuario.apellido2,
            usuario.grado,
            usuario.email,
            usuario.telefono,
            usuario.direccion
        FROM observador 
        RIGHT JOIN usuario ON usuario.documento = observador.documento
        INNER JOIN directorio ON directorio.documento = usuario.documento
        WHERE usuario.documento = ? OR observador.documento = ?
    `;

    const [rows] = await db.query(query, [documento, documento]);

    if (!rows || rows.length === 0) return [];

    const resultados = rows.map(row => ({
        usuario: {
            nombreCompleto: `${row.nombre1 || ''} ${row.nombre2 || ''} ${row.apellido1 || ''} ${row.apellido2 || ''}`.trim(),
            grado: row.grado || null,
            email: row.email || null,
            telefono: row.telefono || null,
            direccion: row.direccion || null,
            id_detalle: row.id_detalle || null,
            documento: row.documento || null,
            rh_esudiante: row.rh_estudiante || null,
            eps: row.eps || null,
            fecha_naci: row.fecha_naci || null,
            enfermedades: row.enfermedades || null,
            nom_acu: row.nom_acu || null,
            tel_acu: row.telefono_acu || null,
            doc_acu: row.doc_acu || null,
            email_acu: row.email_acu || null,
        },
        observador: {
            idobservador: row.idobservador || null,
            fecha: row.fecha || null,
            descripcion_falta: row.descripcion_falta || "Sin descripción",
            compromiso: row.compromiso || "Sin compromiso",
            firma: row.firma || null,
            docente: row.seguimiento || "Sin seguimiento",
            falta: row.falta || "Leve",
            trimestre: row.trimestre || "I"
        }
    }));

    return resultados;
};

router.get('/pdf/:documento', verifyToken, async (req, res) => {
    const { documento } = req.params;
    try {
        const datos = await obtenerObservadorPorDocumento(documento);

        if (!datos || datos.length === 0) {
            return res.status(404).json({ mensaje: 'No hay datos para el documento' });
        }

        const usuario = datos[0].usuario;

        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=observador-${documento}.pdf`);
        doc.pipe(res);

        // Encabezado institucional
        const logoIzq = path.join(__dirname, '../assets/icon.png');
        const logoDer = path.join(__dirname, '../assets/R.jpg');

        // Logos institucionales
        if (fs.existsSync(logoIzq)) {
            doc.image(logoIzq, 38, 40, { width: 80 });
        }
        if (fs.existsSync(logoDer)) {
            doc.image(logoDer, 470, 40, { width: 80 });
        }

        doc.fontSize(10).text('SECRETARÍA DE EDUCACIÓN - BOGOTÁ DC', 0, 50, { align: 'center' });
        doc.fontSize(14).text('COLEGIO TÉCNICO JOSÉ FÉLIX RESTREPO I.E.D.', { align: 'center', underline: true });
        doc.fontSize(10).text('FORMAMOS LÍDERES EN TRANSFORMACIÓN SOCIAL', { align: 'center' });
        doc.moveDown().fontSize(12).text('REGISTRO ACADÉMICO Y DE CONVIVENCIA', { align: 'center', underline: true });
        doc.moveDown(2);

        // Foto del estudiante
        const fotoUser = path.join(__dirname, '../fotos', usuario.foto || 'user.png');
        const yFoto = doc.y;
        if (usuario.foto && fs.existsSync(fotoUser)) {
            doc.image(fotoUser, 420, yFoto, { width: 100, height: 120 });
        } else {
            doc.rect(420, yFoto, 100, 120).stroke();
            doc.fontSize(8).text('Foto no disponible', 430, yFoto + 50);
        }

        // Forzamos que los textos comiencen debajo de la imagen
        doc.y = yFoto + 130; // 120 de alto + 10 de margen

        // Datos del estudiante
        doc.fontSize(12).text('DATOS DEL ESTUDIANTE', 40, 170, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Nombre completo: ${usuario.nombreCompleto}`);
        doc.text(`Curso: ${usuario.grado}`);
        doc.text(`Documento: ${usuario.documento}`);
        doc.text(`Teléfono fijo: ${usuario.telefono}`);
        doc.text(`Dirección de residencia: ${usuario.direccion}`);
        doc.moveDown(0.5);
        doc.fontSize(12).text('DIRECTORIO DEL ESTUDIANTE');
        doc.fontSize(10);
        doc.text(`EPS: ${usuario.eps || "No registrado"}`);
        doc.text(`RH: ${usuario.rh_esudiante || "No registrado"}`);
        doc.text(`Fecha de nacimiento: ${usuario.fecha_naci ? new Date(usuario.fecha_naci).toLocaleDateString() : 'No registrada'}`);
        doc.text(`Enfermedades: ${usuario.enfermedades || "N/A"}`);
        doc.text(`Nombre del acudiente: ${usuario.nom_acu || "No registrado"}`);
        doc.text(`Teléfono del acudiente: ${usuario.tel_acu || "No registrado"}`);
        doc.text(`Documento del acudiente: ${usuario.doc_acu || "No registrado"}`);
        doc.text(`Correo del acudiente: ${usuario.email_acu || "No registrado"}`);
        doc.moveDown();

        // Observaciones
        doc.fontSize(12).text('DETALLE DE OBSERVACIONES', { underline: true });
        doc.moveDown(0.5);

        datos.forEach((item, index) => {
            const obs = item.observador;
            doc.fontSize(10).text(`Observación #${index + 1}`, { underline: true });
            doc.text(`Trimestre: ${obs.trimestre} / Fecha: ${obs.fecha ? new Date(obs.fecha).toLocaleDateString() : 'No registrada'} / Tipo de Falta: ${obs.falta}`);
            doc.text(`Descripción de la situación: ${obs.descripcion_falta}`);
            doc.text(`Compromiso del estudiante o familiar: ${obs.compromiso}`);
            doc.text(`Docente que hace seguimiento: ${obs.docente}`);
            doc.moveDown(1);
            doc.text('Firma del Estudiante: _____________________________');
            doc.text('Documento: ___________________');
            doc.moveDown(1);
            doc.text('Seguimiento: ' + (obs.docente || 'N/A'));
            doc.moveDown(1);
            doc.text('--------------------------------------------------------------------------');
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ mensaje: 'Error al generar el PDF' });
    }
});


module.exports = router;

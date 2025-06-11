const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Obtener todos los registros del directorio
router.get("/", async (req, res) => {
    try {
        const resultados = await db.query("SELECT * FROM directorio");
        res.json({ success: true, data: resultados });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener el directorio", error: error.message });
    }
});

// Obtener por id_detalle
router.get("/:id_detalle", async (req, res) => {
    try {
        const { id_detalle } = req.params;
        const resultado = await db.query("SELECT * FROM directorio WHERE id_detalle = ?", [id_detalle]);

        if (resultado.length === 0) {
            return res.status(404).json({ success: false, message: "Registro no encontrado" });
        }

        res.json({ success: true, data: resultado[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener el registro", error: error.message });
    }
});

// Crear nuevo registro
router.post("/", async (req, res) => {
    try {
        const {
            documento, rh_estudiante, eps, fecha_nac,
            enfermedades, nom_acu, telefono_acu, doc_acu, email_acu
        } = req.body;

        const result = await db.query(
            `INSERT INTO directorio 
            (documento, rh_estudiante, eps, fecha_nac, enfermedades, nom_acu, telefono_acu, doc_acu, email_acu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [documento, rh_estudiante, eps, fecha_nac, enfermedades, nom_acu, telefono_acu, doc_acu, email_acu]
        );

        res.status(201).json({ success: true, message: "Registro creado", data: { id_detalle: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al crear registro", error: error.message });
    }
});

// Actualizar registro
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        rh_estudiante,
        eps,
        fecha_nac,
        enfermedades,
        nom_acu,
        telefono_acu,
        doc_acu,
        email_acu,
    } = req.body;

    try {
        await db.query(
        'UPDATE directorio SET rh_estudiante = ?, eps = ?, fecha_naci = ?, enfermedades = ?, nom_acu = ?, telefono_acu = ?, doc_acu = ?, email_acu = ? WHERE documento = ?',
        [rh_estudiante, eps, fecha_nac, enfermedades, nom_acu, telefono_acu, doc_acu, email_acu, id]
        );
        res.json({ success: true, message: 'Directorio actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al actualizar directorio' });
    }
});


// Eliminar registro
router.delete("/:id_detalle", async (req, res) => {
    try {
        const { id_detalle } = req.params;
        const result = await db.query("DELETE FROM directorio WHERE id_detalle = ?", [id_detalle]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Registro no encontrado" });
        }

        res.json({ success: true, message: "Registro eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al eliminar", error: error.message });
    }
});

module.exports = router;

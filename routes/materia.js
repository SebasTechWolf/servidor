const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Obtener todas las materias
router.get("/", async (req, res) => {
    try {
        const materias = await db.query("SELECT * FROM materia");
        res.json({ success: true, data: materias });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener materias", error: error.message });
    }
});

// Obtener materia por ID
router.get("/:idmat", async (req, res) => {
    try {
        const { idmat } = req.params;
        const materia = await db.query("SELECT materia.nomb_mat, profesor_materia.* FROM materia INNER JOIN profesor_materia ON materia.idMat = profesor_materia.idMat WHERE profesor_materia.documento = ?", [idmat]);

        if (materia.length === 0) {
            return res.status(404).json({ success: false, message: "Materia no encontrada" });
        }

        res.json({ success: true, data: materia[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener materia", error: error.message });
    }
});

// Crear materia
router.post("/", async (req, res) => {
    try {
        const { nomb_mater } = req.body;

        if (!nomb_mater) {
            return res.status(400).json({ success: false, message: "El nombre de la materia es obligatorio" });
        }

        const result = await db.query("INSERT INTO materia (nomb_mater) VALUES (?)", [nomb_mater]);

        res.status(201).json({
            success: true,
            message: "Materia creada correctamente",
            data: { idmat: result.insertId, nomb_mater }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al crear materia", error: error.message });
    }
});

// Actualizar materia
router.put("/:idmat", async (req, res) => {
    try {
        const { idmat } = req.params;
        const { nomb_mater } = req.body;

        const result = await db.query("UPDATE materia SET nomb_mater = ? WHERE idmat = ?", [nomb_mater, idmat]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Materia no encontrada" });
        }

        res.json({ success: true, message: "Materia actualizada", data: { idmat, nomb_mater } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al actualizar materia", error: error.message });
    }
});

// Eliminar materia
router.delete("/:idmat", async (req, res) => {
    try {
        const { idmat } = req.params;
        const result = await db.query("DELETE FROM materia WHERE idmat = ?", [idmat]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Materia no encontrada" });
        }

        res.json({ success: true, message: "Materia eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al eliminar materia", error: error.message });
    }
});

module.exports = router;

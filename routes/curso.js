const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Obtener todos los cursos
router.get("/", async (req, res) => {
    try {
        const cursos = await db.query("SELECT * FROM curso");
        res.json({ success: true, data: cursos });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener cursos", error: error.message });
    }
});

router.get("/all", async (req, res) => {
    try {
        // 1. Obtener la información de cursos y sus materias asociadas
        const [rows] = await db.query(`
            SELECT 
                curso.grado,
                CONCAT(usuario.nombre1, " ", usuario.nombre2, " ", usuario.apellido1," ", usuario.apellido2) AS nombre,
                curso.salon,
                materia.idmat,
                materia.nomb_mat
            FROM curso_materia
            INNER JOIN materia ON materia.idmat = curso_materia.idmat
            INNER JOIN curso ON curso.grado = curso_materia.grado
            RIGHT JOIN usuario ON usuario.grado=curso.grado
            WHERE usuario.id_rol = 102 OR usuario.id_rol=104
        `)

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No se encontraron cursos con materias."
            })
        }

        // 2. Agrupar por grado y salón
        const cursosMap = {}

        rows.forEach(row => {
            const key = `${row.grado}-${row.salon}`

            if (!cursosMap[key]) {
                cursosMap[key] = {
                    id_relacion: row.id_relacion,
                    grado: row.grado,
                    salon: row.salon,
                    profesor: row.nombre,
                    materias: []
                }
            }

            cursosMap[key].materias.push({
                idmat: row.idmat,
                nomb_mat: row.nomb_mat
            })
        })

        // 3. Formatear respuesta final
        const responseData = Object.values(cursosMap)

        res.json({
            success: true,
            data: responseData
        })
    } catch (error) {
        console.error("Error al obtener cursos con materias:", error)
        res.status(500).json({
            success: false,
            message: "Error al obtener cursos con materias",
            error: error.message
        })
    }
})


// Obtener curso por grado
router.get("/:grado", async (req, res) => {
    try {
        const { grado } = req.params;
        const curso = await db.query("SELECT * FROM curso WHERE grado = ?", [grado]);

        if (curso.length === 0) {
            return res.status(404).json({ success: false, message: "Curso no encontrado" });
        }

        res.json({ success: true, data: curso[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener curso", error: error.message });
    }
});

// Crear nuevo curso
router.post("/", async (req, res) => {
    try {
        const { grado, salon } = req.body;

        const result = await db.query("INSERT INTO curso (grado, salon) VALUES (?, ?)", [grado, salon]);

        res.status(201).json({ success: true, message: "Curso creado", data: { grado } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al crear curso", error: error.message });
    }
});

// Actualizar curso
router.put("/:grado", async (req, res) => {
    try {
        const { grado } = req.params;
        const { salon } = req.body;

        const result = await db.query("UPDATE curso SET salon = ? WHERE grado = ?", [salon, grado]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Curso no encontrado" });
        }

        res.json({ success: true, message: "Curso actualizado", data: { grado } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al actualizar curso", error: error.message });
    }
});

// Eliminar curso
router.delete("/:grado", async (req, res) => {
    try {
        const { grado } = req.params;
        const result = await db.query("DELETE FROM curso WHERE grado = ?", [grado]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Curso no encontrado" });
        }

        res.json({ success: true, message: "Curso eliminado" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al eliminar curso", error: error.message });
    }
});

module.exports = router;

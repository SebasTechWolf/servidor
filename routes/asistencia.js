const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Obtener todas las asistencias
router.get("/", async (req, res) => {

    try {
        const asistencias = await db.query("SELECT * FROM asistencia");
        res.json({ success: true, data: asistencias });
    } catch (error) {
        console.error("Error al obtener asistencias:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener asistencias",
            error: error.message,
        });
    }
});

router.get("/all", async (req, res) => {

    try {
        const asistencias = await db.query("SELECT listado.*, asistencia.*, materia.nomb_mat, usuario.grado AS curso FROM asistencia INNER JOIN listado ON listado.idlistado = asistencia.idlistado INNER JOIN usuario ON usuario.documento = asistencia.documento INNER JOIN materia ON materia.idMat = asistencia.idMat GROUP BY asistencia.idlistado");
        res.json({ success: true, data: asistencias });
    } catch (error) {
        console.error("Error al obtener asistencias:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener asistencias",
            error: error.message,
        });
    }
});

// Obtener el detalle de un listado
router.get("/listado/:idlistado", async (req, res) => {
    try {
        const { idlistado } = req.params;
        const { documento } = req.query;

        // 1. Primero obtenemos la información básica del listado (materia, trimestre, etc.)
        const [listadoInfo] = await db.query(`
            SELECT 
                listado.trimestre,
                materia.nomb_mat,
                curso.grado AS curso,
                asistencia.fecha_asistencia,
                CONCAT(usuario.apellido1, ' ', usuario.apellido2, ' ', usuario.nombre1, ' ', usuario.nombre2) AS nombre_completo,
                asistencia.profesor
            FROM asistencia
		 	INNER JOIN listado ON listado.idlistado = asistencia.idlistado 
            INNER JOIN usuario ON usuario.documento = asistencia.documento 
            INNER JOIN curso ON curso.grado = usuario.grado 
            INNER JOIN materia ON materia.idMat = asistencia.idMat
            WHERE listado.idlistado = ?
            lIMIT 1
        `, [idlistado]);

        if (!listadoInfo || listadoInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Listado de asistencia no encontrado"
            });
        }

        // 2. Obtenemos los estudiantes asociados a este listado
        let estudiantesQuery = `
            SELECT 
                a.documento,
                CONCAT(e.apellido1, ' ', e.apellido2, ' ', e.nombre1, ' ', e.nombre2) AS nombre_estudiante,
                a.estado_asis,
                a.justificacion_inasistencia,
                a.idasistencia
            FROM asistencia a
            INNER JOIN usuario e ON e.documento = a.documento
            WHERE a.idlistado = ?
        `;

        const params = [idlistado];

        if (documento) {
            estudiantesQuery += ' AND a.documento = ?';
            params.push(documento);
        }

        const [estudiantesData] = await db.query(estudiantesQuery, params);

        // 3. Formateamos la respuesta según la interfaz AsistenciaDetail
        const responseData = {
            idlistado: idlistado,
            nomb_mat: listadoInfo[0].nomb_mat,
            curso: listadoInfo[0].curso,
            fecha_asistencia: listadoInfo[0].fecha_asistencia,
            trimestre: listadoInfo[0].trimestre,
            profesor: listadoInfo[0].profesor,
            estudiantes: estudiantesData.map(est => ({
                idasistencia: est.idasistencia || idasistencia,
                documento: est.documento.toString(),
                nombre_estudiante: est.nombre_estudiante,
                estado_asis: est.estado_asis === "Asistio" ? "Asistió" : est.estado_asis,
                justificacion_inasistencia: est.justificacion_inasistencia || undefined
            }))
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error al obtener asistencia:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener asistencia",
            error: error.message,
        });
    }
});

// Obtener una asistencia por ID de estudiante
router.get("/estudiante/:documento", async (req, res) => {
    try {
        const { documento } = req.params;
        const asistencia = await db.query("SELECT listado.*, asistencia.*, materia.nomb_mat FROM asistencia INNER JOIN listado ON listado.idlistado = asistencia.idlistado INNER JOIN usuario ON usuario.documento = asistencia.documento INNER JOIN curso ON curso.grado = usuario.grado INNER JOIN materia ON materia.idMat = asistencia.idMat WHERE asistencia.documento = ?", [documento]);

        if (asistencia.length === 0) {
            return res.status(404).json({ success: false, message: "Asistencia no encontrada" });
        }

        res.json({ success: true, data: asistencia });
    } catch (error) {
        console.error("Error al obtener asistencia:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener asistencia",
            error: error.message,
        });
    }
});

//listado de asistencias por profesor
router.get("/:idasistencia", async (req, res) => {
    try {
        const { idasistencia } = req.params;
        const asistencia = await db.query("SELECT listado.*, asistencia.*, materia.nomb_mat, usuario.grado AS curso FROM asistencia INNER JOIN listado ON listado.idlistado = asistencia.idlistado INNER JOIN usuario ON usuario.documento = asistencia.documento INNER JOIN materia ON materia.idMat = asistencia.idMat WHERE asistencia.profesor = ? GROUP BY asistencia.idlistado", [idasistencia]);

        if (asistencia.length === 0) {
            return res.status(404).json({ success: false, message: "Asistencia no encontrada" });
        }

        res.json({ success: true, data: asistencia[0] });
    } catch (error) {
        console.error("Error al obtener asistencia:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener asistencia",
            error: error.message,
        });
    }
});

// Crear una nueva asistencia
router.post("/", async (req, res) => {
    const connection = await db.getConnection();

    const { profesor, estudiantes, idMat, fecha_asistencia, trimestre } = req.body;

    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
        return res.status(400).json({ success: false, message: "No hay estudiantes para registrar" });
    }

    try {
        await connection.beginTransaction();

        const [listadoResult] = await connection.query(
            `INSERT INTO listado (trimestre) VALUES (?)`,
            [trimestre]
        );
        const idlistado = listadoResult.insertId;

        console.log("Datos a insertar:", {
            profesor,
            estudiantes,
            idMat,
            fecha_asistencia,
            idlistado
        });

        const insertQuery = `
      INSERT INTO asistencia 
      (profesor, documento, estado_asis, idMat, fecha_asistencia, justificacion_inasistencia, idlistado)
      VALUES ?
    `;

        const values = estudiantes.map(estudiante => [
            profesor,
            estudiante.documento,
            estudiante.estado_asis,
            idMat,
            fecha_asistencia,
            estudiante.justificacion_inasistencia || null,
            idlistado
        ]);

        await connection.query(insertQuery, [values]);

        const [verificacion] = await connection.query(
            `SELECT COUNT(*) AS total FROM asistencia WHERE idlistado = ?`,
            [idlistado]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            dbConfirmed: verificacion[0].total === estudiantes.length,
            insertedInDb: verificacion[0].total,
            expected: estudiantes.length,
            idlistado
        });

    } catch (error) {
        await connection.rollback();
        console.error("⚠️ ERROR SQL al insertar asistencia:", {
            message: error.message,
            sql: error.sql,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            error: error.message,
            dbError: error.sqlMessage || "No SQL error"
        });
    }
});


// Actualizar una asistencia
router.put("/:idasistencia", async (req, res) => {
    try {
        const { idasistencia } = req.params;
        const campos = req.body;

        const keys = Object.keys(campos);
        const values = Object.values(campos);

        if (keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron campos para actualizar",
            });
        }

        const updateStr = keys.map(key => `${key} = ?`).join(", ");
        const result = await db.query(
            `UPDATE asistencia SET ${updateStr} WHERE idasistencia = ?`,
            [...values, idasistencia]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Asistencia no encontrada",
            });
        }

        res.json({
            success: true,
            message: "Asistencia actualizada correctamente",
            data: { idasistencia },
        });
    } catch (error) {
        console.error("Error al actualizar asistencia:", error);
        res.status(500).json({
            success: false,
            message: "Error al actualizar asistencia",
            error: error.message,
        });
    }
});

// Eliminar una asistencia
router.delete("/:idasistencia", async (req, res) => {
    try {
        const { idasistencia } = req.params;

        const result = await db.query("DELETE FROM listado WHERE idlistado = ?", [idasistencia]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Asistencia no encontrada",
            });
        }

        res.json({
            success: true,
            message: "Asistencia eliminada correctamente",
        });
    } catch (error) {
        console.error("Error al eliminar asistencia:", error);
        res.status(500).json({
            success: false,
            message: "Error al eliminar asistencia",
            error: error.message,
        });
    }
});

module.exports = router;

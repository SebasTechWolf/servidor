const jwt = require("jsonwebtoken");
const db = require("../config/db");

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(403).json({ success: false, message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'Token inválido o ausente' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        //const decoded = jwt.verify(token, "secretkeygoe");

        // Validar campos esperados
        if (!decoded.documento || !decoded.id_rol || !decoded.email) {
            return res.status(401).json({
                success: false,
                message: "Estructura de token inválida",
            });
        }

        // Buscar al usuario por documento (id)
        const [usuarios] = await db.query(
            "SELECT *, AES_DECRYPT(clave, 'SENA') AS pass FROM usuario WHERE documento = ?",
            [decoded.documento]
        );

        const mapRole = (dbRole) => {
            const roleMapping = {
                1: "101", // Estudiante
                2: "102", // Docente
                3: "104" // Administrador
            };
            return roleMapping[dbRole] || "101"; // Valor por defecto si no coincide
        };

        if (!usuarios || usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado",
            });
        }

        const usuario = usuarios[0];

        // Verificar que el email del token coincida con el email del usuario
        if (decoded.email !== usuario.email) {
            return res.status(401).json({
                success: false,
                message: "El token no coincide con el usuario",
            });
        }

        // Adjuntar los datos del usuario a la petición
        req.user = {
            documento: usuario.documento,
            nombre1: usuario.nombre1,
            nombre2: usuario.nombre2,
            apellido1: usuario.apellido1,
            apellido2: usuario.apellido2,
            email: usuario.email,
            telefono: usuario.telefono,
            direccion: usuario.direccion,
            grado: usuario.grado,
            id_rol: usuario.id_rol,
            foto: usuario.foto
        };

        next();
    } catch (error) {
        console.error("Error en verificación de token:", error);

        let message = "Token inválido";
        if (error.name === "TokenExpiredError") {
            message = "Token expirado";
        } else if (error.name === "JsonWebTokenError") {
            message = "Token malformado";
        }

        return res.status(401).json({
            success: false,
            message,
            error: error.message,
        });
    }
};

module.exports = verifyToken;

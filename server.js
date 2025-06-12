const express = require("express")
const app = express()
const http = require("http")
const server = http.createServer(app)
const logger = require("morgan")
const cors = require("cors")
require('dotenv').config({ path: './db.env' });

const app = express();

app.use(cors({
  origin:
    ["https://goe-web.vercel.app"],
    credentials: true
}));

// Importar rutas - Asegúrate de que el nombre del archivo sea correcto
const asistenciaRoutes = require("./routes/asistencia")
const cursoRoutes = require("./routes/curso")
const directorioRoutes = require("./routes/directorio")
const materiaRoutes = require("./routes/materia")
const usuarioRoutes = require("./routes/usuario")
const observadorRoutes = require("./routes/observador")

const port = process.env.PORT || 3000
app.use(logger("dev"))
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
})) // Solo una vez al inicio

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use((req, res, next) => {
  console.log('Body recibido:', req.body) // Log para diagnóstico
  next()
})
app.disable("x-powered-by")

app.set("port", port)

// Usar rutas
app.use("/api/asistencia", asistenciaRoutes)
app.use("/api/curso", cursoRoutes)
app.use("/api/directorio", directorioRoutes)
app.use("/api/materia", materiaRoutes)
app.use("/api/usuario", usuarioRoutes)
app.use("/api/observador", observadorRoutes)

// Ruta raíz para verificar que el servidor está funcionando
app.get("/", (req, res) => {
  res.send("API del Sistema de GOE ()")
})

// Agregar rutas de prueba para diagnóstico
app.get("/api/test", (req, res) => {
  res.json({ message: "La API está funcionando correctamente" })
})

app.get("/api/observador/test", (req, res) => {
  res.json({ message: "La ruta /api/observador está configurada correctamente" })
})

// Direccion ip V4 de la maquina, consultar con ipconfig
server.listen(port, "0.0.0.0", () => {
  console.log("Aplicación de NodeJS " + process.pid + " iniciada en el puerto " + port)

  // Mostrar las direcciones IP disponibles para conectarse
  const { networkInterfaces } = require("os")
  const nets = networkInterfaces()
  console.log("Direcciones IP disponibles:")
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Mostrar solo direcciones IPv4
      if (net.family === "IPv4" && !net.internal) {
        console.log(`- ${name}: ${net.address}`)
      }
    }
  }
  //console.log(`También puedes acceder usando localhost: http://localhost:${port}`)
  console.log(`O usando la IP local: ftp://151.106.96.82:${port}`)
})

// Agregar un manejador para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.log(err)
  res.status(err.status || 500).send(err.stack)
})

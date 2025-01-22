require("dotenv").config();
const express = require("express");
const cors = require("cors");
const downloadRoutes = require("./routes/download");
const playlistRoutes = require("./routes/playlist");

const app = express();
const port = process.env.PORT || 3000;

// Configuration des origines autorisées
const allowedOrigins = [
  "http://localhost:5173", // Frontend en développement
  "https://sound-free.netlify.app", // Frontend en production
];

// Middleware CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permettre les requêtes sans origine (comme les appels API directs)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Non autorisé par CORS"));
      }
    },
    credentials: true, // Si vous utilisez des cookies ou l'authentification
  })
);
app.use(express.json());

// Routes
app.use("/api/track", downloadRoutes);
app.use("/api/playlist", playlistRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Soundfree Backend API is running!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const downloadRoutes = require("./routes/download");

const app = express();
const port = process.env.PORT || 3000;

// Ajoutez une variable pour l'URL autorisée en CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

// Middleware
app.use(
  cors({
    origin: allowedOrigin,
  })
);
app.use(express.json());

// Routes
app.use("/api", downloadRoutes);

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

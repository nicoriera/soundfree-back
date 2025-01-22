const express = require("express");
const scdl = require("soundcloud-downloader").default;
const ytdl = require("ytdl-core");
const router = express.Router();
const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

// Configuration de la clé client SoundCloud
const getClientId = async () => {
  try {
    const clientId = await scdl.getClientID();
    console.log("Client ID obtained:", clientId);
    return clientId;
  } catch (error) {
    console.error("Error getting client ID:", error);
    throw error;
  }
};

// Initialisation de la clé client
(async () => {
  try {
    const newClientId = await getClientId();
    scdl.setClientID(newClientId);
    console.log("SoundCloud client ID initialized successfully");
  } catch (error) {
    console.error("Failed to initialize SoundCloud client ID:", error);
  }
})();

// Endpoint pour les informations d'une playlist
router.post("/playlist-info", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL manquante" });
    }

    // Vérifier si c'est bien une URL de playlist Soundcloud
    if (!url.includes("soundcloud.com") || !url.includes("/sets/")) {
      return res
        .status(400)
        .json({ error: "URL de playlist Soundcloud invalide" });
    }

    // Récupérer les informations de la playlist
    const playlistInfo = await scdl.getSetInfo(url, CLIENT_ID);

    // Formater la réponse
    const response = {
      playlistTitle: playlistInfo.title,
      tracks: playlistInfo.tracks.map((track) => ({
        title: track.title,
        url: track.permalink_url,
        duration: track.duration,
        artist: track.user.username,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Erreur playlist-info:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des informations de la playlist",
      details: error.message,
    });
  }
});

// Route pour obtenir les informations
router.post("/info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log("Processing URL:", url);
    const isSoundCloud = url.includes("soundcloud.com");

    if (isSoundCloud) {
      console.log("Processing SoundCloud URL");
      // S'assurer que nous avons un client ID
      if (!scdl.clientID) {
        console.log("No client ID found, obtaining new one");
        const newClientId = await getClientId();
        scdl.setClientID(newClientId);
      }

      const info = await scdl.getInfo(url);
      console.log("SoundCloud info retrieved:", info);
      res.json({
        title: info.title,
        duration: info.duration / 1000,
        thumbnail: info.artwork_url,
      });
    } else {
      console.log("Processing YouTube URL");
      const info = await ytdl.getInfo(url);
      console.log("YouTube info retrieved");
      res.json({
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        thumbnail: info.videoDetails.thumbnails[0].url,
      });
    }
  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({
      error: "Failed to get track information",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Route pour le téléchargement
router.post("/download", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log("Processing download URL:", url);
    const isSoundCloud = url.includes("soundcloud.com");

    if (isSoundCloud) {
      console.log("Downloading from SoundCloud");
      // S'assurer que nous avons un client ID
      if (!scdl.clientID) {
        const newClientId = await getClientId();
        scdl.setClientID(newClientId);
      }

      const info = await scdl.getInfo(url);
      const title = info.title.replace(/[^\w\s]/gi, "");

      res.header("Content-Disposition", `attachment; filename="${title}.mp3"`);
      res.header("Content-Type", "audio/mpeg");

      // Obtenir l'URL du flux progressif
      const stream = await scdl.download(url, {
        format: "mp3",
        progressive: true, // Utiliser le flux progressif au lieu de HLS
      });

      console.log("Stream obtained, starting pipe...");
      stream.pipe(res);

      stream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "Stream error", details: error.message });
        }
      });

      stream.on("end", () => {
        console.log("Stream ended successfully");
      });
    } else {
      console.log("Downloading from YouTube");
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, "");

      res.header(
        "Content-Disposition",
        `attachment; filename="${videoTitle}.mp3"`
      );
      res.header("Content-Type", "audio/mpeg");

      ytdl(url, {
        filter: "audioonly",
        quality: "highestaudio",
        format: "mp3",
      }).pipe(res);
    }
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Erreur lors du téléchargement",
        details: error.message,
      });
    }
  }
});

module.exports = router;

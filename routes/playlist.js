const express = require("express");
const router = express.Router();
const scdl = require("soundcloud-downloader").default;
const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

// Route pour obtenir les infos de la playlist
router.post("/info", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL manquante" });
    }

    if (!url.includes("soundcloud.com") || !url.includes("/sets/")) {
      return res
        .status(400)
        .json({ error: "URL de playlist Soundcloud invalide" });
    }

    // Vérifier que le client ID est bien défini
    if (!CLIENT_ID) {
      console.error("CLIENT_ID manquant");
      return res
        .status(500)
        .json({ error: "Configuration du serveur incorrecte" });
    }

    // Récupérer les informations de la playlist avec gestion d'erreur
    let playlistInfo;
    try {
      playlistInfo = await scdl.getSetInfo(url);
    } catch (error) {
      console.error("Erreur getSetInfo:", error);
      return res.status(500).json({
        error: "Impossible de récupérer les informations de la playlist",
        details: error.message,
      });
    }

    // Vérifier que playlistInfo est bien défini
    if (!playlistInfo || !playlistInfo.tracks) {
      console.error("Réponse invalide de getSetInfo");
      return res
        .status(500)
        .json({ error: "Réponse invalide du serveur Soundcloud" });
    }

    // Formater la réponse
    const response = {
      playlistTitle: playlistInfo.title,
      tracks: playlistInfo.tracks.map((track) => ({
        title: track.title,
        url: track.permalink_url,
        duration: track.duration,
        artist: track.user?.username || "Unknown Artist",
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Erreur playlist-info:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des informations",
      details: error.message,
    });
  }
});

// Route pour télécharger une piste de la playlist
router.post("/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL manquante" });
    }

    // Vérifier que le client ID est bien défini
    if (!CLIENT_ID) {
      console.error("CLIENT_ID manquant");
      return res
        .status(500)
        .json({ error: "Configuration du serveur incorrecte" });
    }

    // Récupérer les informations de la piste
    const trackInfo = await scdl.getInfo(url);

    if (!trackInfo) {
      return res
        .status(500)
        .json({
          error: "Impossible de récupérer les informations de la piste",
        });
    }

    // Créer le stream de téléchargement
    const stream = await scdl.download(url);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${trackInfo.title}.mp3"`
    );

    stream.pipe(res);

    stream.on("error", (error) => {
      console.error("Erreur de streaming:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Erreur lors du téléchargement",
          details: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Erreur playlist-download:", error);
    res.status(500).json({
      error: "Erreur lors du téléchargement",
      details: error.message,
    });
  }
});

module.exports = router;

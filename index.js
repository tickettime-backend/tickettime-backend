import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // <- must be first

const app = express();
const PORT = process.env.PORT || 10000;
const MYBOOKIE_NFL_URL = process.env.MYBOOKIE_NFL_URL;

app.use(express.json());

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send("Ticket Time backend running ✅");
});

/* =========================
   TEST API KEY
========================= */
app.get("/test-key", (req, res) => {
  res.json({
    success: true,
    mybookieKeyExists: !!MYBOOKIE_NFL_URL,
  });
});

/* =========================
   NFL GAMES
========================= */
app.get("/games", async (req, res) => {
  try {
    const response = await fetch(MYBOOKIE_NFL_URL);
    const data = await response.json();

    if (!data || !data.games) return res.json({ success: true, games: [] });

    const games = data.games.map((game) => ({
      gameId: game.id,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      startTime: game.start_time,
      status: game.status,
      moneyline: game.moneyline,
      spread: game.spreads,
      total: game.totals,
    }));

    res.json({ success: true, games });
  } catch (err) {
    console.error("NFL games error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Ticket Time backend live on port ${PORT}`));

import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 10000;

/* ============================
   CONFIG
============================ */
// Trim the API key to remove any extra spaces/newlines
const SPORTS_ODDS_API_KEY = process.env.SPORTS_ODDS_API_KEY?.trim();

/* ============================
   ROOT
============================ */
app.get("/", (req, res) => {
  res.send("TicketTime backend running ✅");
});

/* ============================
   TEST API KEY
============================ */
app.get("/test-key", (req, res) => {
  res.json({
    success: true,
    keyExists: !!SPORTS_ODDS_API_KEY,
    keyValue: SPORTS_ODDS_API_KEY // optional
  });
});

/* ============================
   CHECK SERVER IP
============================ */
app.get("/ip", async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch IP" });
  }
});

/* ============================
   ODDS (NBA GAMES)
============================ */
app.get("/odds", async (req, res) => {
  try {
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=NBA&limit=20`;

    const response = await fetch(url, {
      headers: { "x-api-key": SPORTS_ODDS_API_KEY }
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch odds" });
    }

    const data = await response.json();
    const games = data.events.map(game => ({
      gameId: game.eventID,
      matchup: `${game.homeTeam} vs ${game.awayTeam}`,
      startTime: game.startTime,
      league: "NBA"
    }));

    res.json({ success: true, games });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   PLAYER PROPS (NBA)
============================ */
app.get("/player-props", async (req, res) => {
  try {
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=NBA&limit=20`;

    const response = await fetch(url, {
      headers: { "x-api-key": SPORTS_ODDS_API_KEY }
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch player props" });
    }

    const data = await response.json();
    const playerProps = [];

    data.events.forEach(game => {
      game.playerProps?.forEach(prop => {
        playerProps.push({
          league: "NBA",
          game: `${game.homeTeam} vs ${game.awayTeam}`,
          player: prop.playerName,
          stat: prop.statType,
          line: prop.line,
          odds: prop.odds,
          sportsbook: prop.bookmaker
        });
      });
    });

    res.json({
      success: true,
      count: playerProps.length,
      playerProps
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   START SERVER
============================ */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

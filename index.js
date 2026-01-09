import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 10000;

/* ============================
   CONFIG
============================ */
const SPORTS_ODDS_API_KEY = process.env.SPORTS_ODDS_API_KEY?.trim();

app.use(bodyParser.json());

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
    keyValue: SPORTS_ODDS_API_KEY // Remove in production
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
   ODDS (Multi-Sport)
============================ */
app.get("/odds", async (req, res) => {
  try {
    const sport = req.query.sport || "NBA"; // default NBA
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${sport}&limit=20`;

    const response = await fetch(url, {
      headers: { "x-api-key": SPORTS_ODDS_API_KEY }
    });

    if (!response.ok) return res.status(500).json({ error: "Failed to fetch odds" });

    const data = await response.json();
    const games = (data.events || []).map(game => ({
      gameId: game.eventID,
      matchup: `${game.homeTeam} vs ${game.awayTeam}`,
      startTime: game.startTime,
      league: sport
    }));

    res.json({ success: true, games });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   PLAYER PROPS (Multi-Sport)
============================ */
app.get("/player-props", async (req, res) => {
  try {
    const sport = req.query.sport || "NBA";
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${sport}&limit=20`;

    const response = await fetch(url, {
      headers: { "x-api-key": SPORTS_ODDS_API_KEY }
    });

    if (!response.ok) return res.status(500).json({ error: "Failed to fetch player props" });

    const data = await response.json();
    const playerProps = [];

    (data.events || []).forEach(game => {
      (game.playerProps || []).forEach(prop => {
        playerProps.push({
          league: sport,
          game: `${game.homeTeam} vs ${game.awayTeam}`,
          gameId: game.eventID,
          player: prop.playerName,
          stat: prop.statType,
          line: prop.line,
          odds: prop.odds,
          sportsbook: prop.bookmaker,
          overUnder: prop.overUnder || null
        });
      });
    });

    res.json({ success: true, count: playerProps.length, playerProps });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   PLACE BET
============================ */
app.post("/place-bet", async (req, res) => {
  const { bets } = req.body;

  if (!bets || !Array.isArray(bets) || bets.length === 0) {
    return res.status(400).json({ success: false, error: "No bets provided" });
  }

  try {
    const results = await Promise.all(bets.map(async (bet) => {
      const response = await fetch("https://sportsgameodds.com/v2/place-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SPORTS_ODDS_API_KEY
        },
        body: JSON.stringify({
          sport: bet.sport,
          gameId: bet.gameId,
          player: bet.player,
          stat: bet.stat,
          line: bet.line,
          odds: bet.odds,
          overUnder: bet.overUnder
        })
      });

      return await response.json();
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) return res.json({ success: false, error: "Some bets failed", details: failed });

    res.json({ success: true });

  } catch (err) {
    console.error("Place Bet Error:", err);
    res.status(500).json({ success: false, error: "Failed to place bet" });
  }
});

/* ============================
   START SERVER
============================ */
app.listen(port, () => console.log(`Server running on port ${port}`));

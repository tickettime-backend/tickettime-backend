import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 10000;

/* ============================
   CONFIG
============================ */
const ODDS_API_KEY = process.env.ODDS_API_KEY;

/* ============================
   ROOT
============================ */
app.get("/", (req, res) => {
  res.send("TicketTime backend running ✅");
});

/* ============================
   TEST API KEY (STEP 2)
============================ */
app.get("/test-key", (req, res) => {
  res.json({
    success: true,
    keyExists: !!ODDS_API_KEY,
    keyValue: ODDS_API_KEY // optional, can remove if you don't want to expose
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
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?regions=us&markets=h2h,spreads,totals&apiKey=${ODDS_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch odds" });
    }

    const data = await response.json();

    const games = data.map(game => ({
      gameId: game.id,
      matchup: `${game.home_team} vs ${game.away_team}`,
      startTime: game.commence_time
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
    const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?regions=us&markets=player_points,player_rebounds,player_assists&apiKey=${ODDS_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch player props" });
    }

    const data = await response.json();
    const playerProps = [];

    data.forEach(game => {
      game.bookmakers?.forEach(book => {
        book.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            playerProps.push({
              league: "NBA",
              game: `${game.home_team} vs ${game.away_team}`,
              player: outcome.description,
              stat: market.key,
              line: outcome.point,
              odds: outcome.price,
              sportsbook: book.title
            });
          });
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

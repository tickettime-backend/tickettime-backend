import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const SPORTS_ODDS_API_KEY = process.env.SPORTS_ODDS_API_KEY;

app.use(express.json());

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send("Ticket Time sweepstakes backend running ✅");
});

/* =========================
   TEST API KEY
========================= */
app.get("/test-key", (req, res) => {
  res.json({
    success: true,
    keyExists: !!SPORTS_ODDS_API_KEY,
  });
});

/* =========================
   TEST SPORTS ODDS API
========================= */
app.get("/test-odds-api", async (req, res) => {
  try {
    const LEAGUE_ID = req.query.leagueId || 79; // default NFL
    const url = `https://www.mybookie.ag/odds/?l=${LEAGUE_ID}&o=E&isXml=False`;

    const response = await fetch(url, {
      headers: {
        "x-api-key": SPORTS_ODDS_API_KEY,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Failed to fetch odds" });
    }

    const data = await response.json();
    const sampleGames = data.events?.slice(0, 5) || [];

    res.json({ success: true, sampleGames });
  } catch (err) {
    console.error("Test Odds API Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   GAMES (UPCOMING + LIVE)
========================= */
app.get("/games", async (req, res) => {
  try {
    const url = "https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/events";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": SPORTS_ODDS_API_KEY,
      },
    });

    const data = await response.json();
    if (!data || !data.data) return res.json({ success: true, games: [] });

    const games = Object.values(data.data).map((event) => ({
      gameId: event.id,
      league: event.sport_key || "unknown",
      matchup: event.name || `${event.homeTeam || "Home"} vs ${event.awayTeam || "Away"}`,
      homeTeam: event.homeTeam || null,
      awayTeam: event.awayTeam || null,
      startTime: event.startTime || event.commence_time,
      status: event.status || "upcoming",
    }));

    res.json({ success: true, games });
  } catch (err) {
    console.error("Games error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   GAME MARKETS (NO PLAYER PROPS)
========================= */
app.get("/games/:gameId/markets", async (req, res) => {
  try {
    const { gameId } = req.params;
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds?eventId=${gameId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": SPORTS_ODDS_API_KEY,
      },
    });

    const data = await response.json();
    if (!data || !data.data || !data.data[gameId]) return res.json({ success: true, markets: [] });

    const event = data.data[gameId];
    const markets = [];

    event.bookmakers?.forEach((book) => {
      book.markets?.forEach((market) => {
        // ALLOWED GAME MARKETS ONLY
        if (!["h2h", "spreads", "totals", "team_totals", "first_half", "first_quarter"].includes(market.key))
          return;

        market.outcomes?.forEach((outcome) => {
          markets.push({
            gameId,
            marketType: market.key, // spread, total, moneyline, etc
            label: outcome.name, // Home / Away / Over / Under
            line: outcome.point ?? null,
            multiplier: convertOddsToMultiplier(outcome.price),
          });
        });
      });
    });

    res.json({ success: true, markets });
  } catch (err) {
    console.error("Markets error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   MULTIPLIER CONVERSION
========================= */
function convertOddsToMultiplier(odds) {
  if (!odds) return 1.0;
  if (odds > 1) return Number((odds * 0.9).toFixed(2));
  return 1.0;
}

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Ticket Time backend live on port ${PORT}`);
});

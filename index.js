import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

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
    keyExists: !!RAPIDAPI_KEY,
  });
});

/* =========================
   GAMES (UPCOMING + LIVE)
   GAME DATA ONLY
========================= */
app.get("/games", async (req, res) => {
  try {
    const url =
      "https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/events";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host":
          "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    if (!data || !data.data) {
      return res.json({ success: true, games: [] });
    }

    const games = Object.values(data.data).map((event) => ({
      gameId: event.id,
      league: event.sport_key || "unknown",
      matchup:
        event.name ||
        `${event.homeTeam || "Home"} vs ${event.awayTeam || "Away"}`,
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
   GAME PROPS / MARKETS
   (NO PLAYER PROPS)
========================= */
app.get("/games/:gameId/markets", async (req, res) => {
  try {
    const { gameId } = req.params;

    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds?eventId=${gameId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host":
          "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    if (!data || !data.data || !data.data[gameId]) {
      return res.json({ success: true, markets: [] });
    }

    const event = data.data[gameId];
    const markets = [];

    event.bookmakers?.forEach((book) => {
      book.markets?.forEach((market) => {
        // ALLOWED GAME MARKETS ONLY
        if (
          ![
            "h2h",
            "spreads",
            "totals",
            "team_totals",
            "first_half",
            "first_quarter",
          ].includes(market.key)
        )
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
   (ODDS → SWEEPSTAKES SAFE)
========================= */
function convertOddsToMultiplier(odds) {
  if (!odds) return 1.0;

  // Decimal odds → multiplier
  if (odds > 1) {
    return Number((odds * 0.9).toFixed(2)); // house-adjusted
  }

  return 1.0;
}

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Ticket Time backend live on port ${PORT}`);
});

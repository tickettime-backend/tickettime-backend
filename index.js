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
  res.send("TicketTime backend running ✅");
});

/* =========================
   TEST API KEY
========================= */
app.get("/test-key", (req, res) => {
  res.json({
    success: true,
    keyExists: !!RAPIDAPI_KEY
  });
});

/* =========================
   LIVE ODDS (ALL SPORTS)
========================= */
app.get("/odds", async (req, res) => {
  try {
    const eventId = req.query.eventId || ""; // optional filter by event
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds${
      eventId ? `?eventId=${eventId}` : ""
    }&bookmakers=Bet365,Pinnacle,Betfair Sportsbook,Betfair Exchange,Betsson,1xbet`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    if (!data || !data.data) {
      return res.json({ success: true, games: [], message: "No live games found" });
    }

    const games = Object.values(data.data).map(event => ({
      gameId: event.id,
      matchup: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
      startTime: event.startTime || event.commence_time,
      league: event.sport_key || "unknown",
      leagueLogo: "basketball.png" // default basketball logo
    }));

    res.json({ success: true, games });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   PLAYER PROPS (TODAY ONLY)
========================= */
app.get("/player-props", async (req, res) => {
  try {
    const eventId = req.query.eventId || "";
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds${
      eventId ? `?eventId=${eventId}` : ""
    }&bookmakers=Bet365,Pinnacle,Betfair Sportsbook,Betfair Exchange,Betsson,1xbet`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    if (!data || !data.data) {
      return res.json({ success: true, count: 0, playerProps: [] });
    }

    const props = [];

    Object.values(data.data).forEach(event => {
      // Only today’s games
      const gameDate = new Date(event.startTime || event.commence_time);
      const today = new Date();
      if (gameDate.toDateString() !== today.toDateString()) return;

      event.bookmakers?.forEach(book => {
        book.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            props.push({
              game: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
              gameId: event.id,
              player: outcome.description,
              stat: market.key,
              line: outcome.point,
              odds: outcome.price,
              sportsbook: book.title || null,
              overUnder: null
            });
          });
        });
      });
    });

    res.json({ success: true, count: props.length, playerProps: props });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => console.log(`TicketTime backend live on port ${PORT}`));

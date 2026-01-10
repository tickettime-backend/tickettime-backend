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
   ODDS (LIVE GAMES)
========================= */
app.get("/odds", async (req, res) => {
  try {
    const sport = req.query.sport || "basketball_nba";
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds?sport=${sport}&bookmakers=Bet365,Pinnacle,Betfair Sportsbook,Betfair Exchange,Betsson,1xbet`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY
      }
    });

    const data = await response.json();

    if (!data || !data.data) return res.json({ success: false, games: [] });

    const games = Object.values(data.data).map(game => ({
      gameId: game.eventId,
      matchup: `${game.homeTeam} vs ${game.awayTeam}`,
      startTime: game.commenceTime,
      league: sport,
      leagueLogo: sport === "basketball_nba" ? "basketball.png" : null
    }));

    res.json({ success: true, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   PLAYER PROPS
========================= */
app.get("/player-props", async (req, res) => {
  try {
    const sport = req.query.sport || "basketball_nba";
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/playerprops?sport=${sport}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY
      }
    });

    const data = await response.json();

    if (!data || !data.data) return res.json({ success: true, count: 0, playerProps: [] });

    const props = Object.values(data.data).map(prop => ({
      gameId: prop.eventId,
      game: `${prop.homeTeam} vs ${prop.awayTeam}`,
      player: prop.player,
      stat: prop.stat,
      line: prop.line,
      odds: prop.odds,
      sportsbook: prop.bookmaker,
      overUnder: prop.overUnder || null
    }));

    res.json({ success: true, count: props.length, playerProps: props });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => console.log(`TicketTime backend live on port ${PORT}`));

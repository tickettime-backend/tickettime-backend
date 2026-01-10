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
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds?bookmakers=Bet365,Pinnacle,Betfair Sportsbook,Betfair Exchange,Betsson,1xbet&sport=${sport}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();
    if (!data || !data.data) return res.json({ success: false, games: [] });

    const games = Object.values(data

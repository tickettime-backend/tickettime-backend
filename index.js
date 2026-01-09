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
   IN-MEMORY STORAGE
   (Replace with DB in production)
============================ */
let users = []; // {id, email, password, balance, bets: []}
let nextUserId = 1;

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
    keyValue: SPORTS_ODDS_API_KEY // remove in production
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
   USER ACCOUNT
============================ */
// Register
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Missing fields" });
  if (users.find(u => u.email === email)) return res.status(400).json({ success: false, error: "User exists" });

  const user = { id: nextUserId++, email, password, balance: 0, bets: [] };
  users.push(user);
  res.json({ success: true, userId: user.id });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
  res.json({ success: true, userId: user.id, balance: user.balance });
});

/* ============================
   WALLET
============================ */
app.post("/deposit", (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid deposit" });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  user.balance += amount;
  res.json({ success: true, balance: user.balance });
});

app.post("/withdraw", (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ success: false, error: "Invalid withdrawal" });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  if (user.balance < amount) return res.status(400).json({ success: false, error: "Insufficient balance" });

  user.balance -= amount;
  res.json({ success: true, balance: user.balance });
});

/* ============================
   ODDS (Multi-Sport)
============================ */
app.get("/odds", async (req, res) => {
  try {
    const sport = req.query.sport || "NBA";
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${sport}&limit=20`;

    const response = await fetch(url, { headers: { "x-api-key": SPORTS_ODDS_API_KEY } });
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

    const response = await fetch(url, { headers: { "x-api-key": SPORTS_ODDS_API_KEY } });
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
  const { userId, bets } = req.body;
  if (!userId || !bets || !Array.isArray(bets) || bets.length === 0)
    return res.status(400).json({ success: false, error: "Invalid request" });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const totalOdds = bets.reduce((acc, b) => acc + b.odds, 0);
  if (user.balance < totalOdds) return res.status(400).json({ success: false, error: "Insufficient balance" });

  try {
    user.balance -= totalOdds;
    bets.forEach(b => user.bets.push({ ...b, placedAt: new Date() }));

    // OPTIONAL: send to sportsbook API
    const results = await Promise.all(bets.map(async (bet) => {
      const response = await fetch("https://sportsgameodds.com/v2/place-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": SPORTS_ODDS_API_KEY },
        body: JSON.stringify(bet)
      });
      return await response.json();
    }));

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) return res.json({ success: false, error: "Some bets failed", details: failed });

    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to place bet" });
  }
});

/* ============================
   BET HISTORY
============================ */
app.get("/bets", (req, res) => {
  const { userId } = req.query;
  const user = users.find(u => u.id === Number(userId));
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  res.json({ success: true, bets: user.bets, balance: user.balance });
});

/* ============================
   START SERVER
============================ */
app.listen(port, () => console.log(`TicketTime backend running on port ${port}`));

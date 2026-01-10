import express from "express";
import fetch from "node-fetch";
import Stripe from "stripe";

const app = express();
const PORT = process.env.PORT || 10000;

/* ============================
   CONFIG
============================ */
const SPORTS_ODDS_API_KEY = process.env.SPORTS_ODDS_API_KEY?.trim();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;

/* ============================
   MIDDLEWARE
============================ */
app.use(express.json());

/* ============================
   IN-MEMORY STORAGE
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
    keyExists: !!SPORTS_ODDS_API_KEY
  });
});

/* ============================
   USER ACCOUNT
============================ */
app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Missing fields" });
  if (users.find(u => u.email === email)) return res.status(400).json({ success: false, error: "User exists" });

  const user = { id: nextUserId++, email, password, balance: 0, bets: [] };
  users.push(user);
  res.json({ success: true, userId: user.id });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ success: false, error: "Invalid credentials" });
  res.json({ success: true, userId: user.id, balance: user.balance });
});

/* ============================
   WALLET (Stripe)
============================ */
app.post("/deposit", async (req, res) => {
  const { userId, amount, payment_method_id } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user || !amount || amount <= 0)
    return res.status(400).json({ success: false, error: "Invalid deposit" });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: "usd",
      payment_method: payment_method_id,
      confirm: true
    });

    user.balance += amount;
    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/withdraw", async (req, res) => {
  const { userId, amount, bank_account_id } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user || !amount || amount <= 0)
    return res.status(400).json({ success: false, error: "Invalid withdrawal" });
  if (user.balance < amount)
    return res.status(400).json({ success: false, error: "Insufficient balance" });

  try {
    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      destination: bank_account_id
    });

    user.balance -= amount;
    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================
   ODDS (Multi-Sport)
============================ */
app.get("/odds", async (req, res) => {
  try {
    const sport = req.query.sport || "NBA";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${sport}&date=${today}&limit=20`;

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
   PLAYER PROPS (Filtered)
============================ */
app.get("/player-props", async (req, res) => {
  try {
    const sport = req.query.sport || "NBA";
    const today = new Date().toISOString().split("T")[0];
    const url = `https://api.sportsgameodds.com/v2/events?oddsAvailable=true&leagueID=${sport}&date=${today}&limit=20`;

    const response = await fetch(url, { headers: { "x-api-key": SPORTS_ODDS_API_KEY } });
    if (!response.ok) return res.status(500).json({ error: "Failed to fetch player props" });

    const data = await response.json();
    const playerProps = [];

    (data.events || []).forEach(game => {
      (game.playerProps || []).forEach(prop => {
        if (prop.injuryStatus && prop.injuryStatus !== "Healthy") return; // skip injured
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
app.post("/place-bet", (req, res) => {
  const { userId, bets } = req.body;
  if (!userId || !bets || !Array.isArray(bets) || bets.length === 0)
    return res.status(400).json({ success: false, error: "Invalid request" });

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const totalOdds = bets.reduce((acc, b) => acc + b.odds, 0);
  if (user.balance < totalOdds) return res.status(400).json({ success: false, error: "Insufficient balance" });

  try {
    user.balance -= totalOdds;
    user.bets.push(
      ...bets.map(b => ({ ...b, placedAt: new Date(), affiliateUrl: AFFILIATE_LINK }))
    );
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
app.listen(PORT, () => console.log(`TicketTime backend running on port ${PORT}`));

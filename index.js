import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   ENV VARIABLES
========================= */
const PORT = process.env.PORT || 10000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const BONUS_AMOUNT = Number(process.env.BONUS_AMOUNT) || 10;
const MYBOOKIE_NFL_URL = process.env.MYBOOKIE_NFL_URL;

/* =========================
   USERS & BONUS
========================= */
let users = [];
let nextUserId = 1;
const BONUS_NAME = "TicketTime Bonus $10";

/* =========================
   LEAGUES
========================= */
const LEAGUES = {
  NFL: MYBOOKIE_NFL_URL,
  // Add other leagues by creating new URLs
  // NBA: process.env.MYBOOKIE_NBA_URL,
  // MLB: process.env.MYBOOKIE_MLB_URL,
  // NHL: process.env.MYBOOKIE_NHL_URL,
};

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => res.send("TicketTime backend running ✅"));

/* =========================
   REGISTER
========================= */
app.post("/register", (req, res) => {
  const { email, password, state } = req.body;
  if (users.find(u => u.email === email))
    return res.json({ success: false, error: "Email exists" });

  const newUser = {
    id: nextUserId++,
    email,
    password,
    balance: 0,
    bonus: BONUS_AMOUNT, // $10 instant bonus
    slips: [],
    referralUsed: false,
    state: state || null
  };

  users.push(newUser);
  res.json({ success: true, user: newUser });
});

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {
  const user = users.find(u => u.email === req.body.email && u.password === req.body.password);
  if (!user) return res.json({ success: false, error: "Invalid credentials" });
  res.json({ success: true, user });
});

/* =========================
   DEPOSIT
========================= */
app.post("/deposit", (req, res) => {
  const { userId, amount } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: "User not found" });
  user.balance += amount;
  res.json({ success: true, balance: user.balance });
});

/* =========================
   WITHDRAW
========================= */
app.post("/withdraw", (req, res) => {
  const { userId, amount } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: "User not found" });
  if (user.balance < amount) return res.json({ success: false, error: "Insufficient funds" });
  user.balance -= amount;
  res.json({ success: true, balance: user.balance });
});

/* =========================
   REFERRAL BONUS
========================= */
app.post("/apply-referral", (req, res) => {
  const { userId } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: "User not found" });
  if (user.referralUsed) return res.json({ success: false, error: "Already used referral" });
  user.balance += BONUS_AMOUNT; // $10 referral bonus
  user.referralUsed = true;
  res.json({ success: true, balance: user.balance });
});

/* =========================
   FETCH ALL GAMES
========================= */
app.get("/games", async (req, res) => {
  try {
    let allGames = [];
    for (const [sport, url] of Object.entries(LEAGUES)) {
      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data)) continue; // ensure it's an array

      const games = data.map(game => ({
        sport,
        gameId: game.id,
        matchup: game.name || `${game.homeTeam} vs ${game.awayTeam}`,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        startTime: game.startTime,
        lines: game.lines || game.odds
      }));

      allGames.push(...games);
    }

    res.json({ success: true, games: allGames });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   FETCH GAME MARKETS
========================= */
app.get("/games/:gameId/markets", async (req, res) => {
  try {
    const { gameId } = req.params;
    let marketData = null;

    for (const url of Object.values(LEAGUES)) {
      const response = await fetch(url);
      const data = await response.json();
      if (!Array.isArray(data)) continue;

      marketData = data.find(g => g.id == gameId);
      if (marketData) break;
    }

    if (!marketData) return res.json({ success: true, markets: [] });

    const markets = [];
    if (marketData.lines) {
      for (const line of marketData.lines) {
        markets.push({
          marketType: line.key || "moneyline",
          label: line.name || "N/A",
          line: line.point ?? null,
          multiplier: line.price ?? 1
        });
      }
    }

    res.json({ success: true, markets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   PLACE BET / TRACK SLIP
========================= */
app.post("/place-bet", (req, res) => {
  const { userId, slip } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: "User not found" });

  let totalStake = slip.reduce((a, b) => a + b.amount, 0);
  let bonusUsed = 0;

  if (user.bonus > 0) {
    bonusUsed = Math.min(user.bonus, totalStake);
    user.bonus -= bonusUsed;
    totalStake -= bonusUsed;
  }

  if (user.balance < totalStake)
    return res.json({ success: false, error: "Insufficient funds" });

  user.balance -= totalStake;
  user.slips.push({ slip, bonusUsed, timestamp: new Date() });

  res.json({ success: true, slipTracked: true, redirect: AFFILIATE_LINK });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => console.log(`🚀 TicketTime backend running on ${PORT}`));

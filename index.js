import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

app.use(express.json());
app.use(cors());

/* Users & Wallets */
let users = [];
let nextUserId = 1;

/* Bonus System */
const BONUS_NAME = "TicketTime Bonus $10";

/* League IDs */
const LEAGUES = {
  NFL: 79,
  NBA: 82,
  MLB: 81,
  NHL: 83,
  NCAA_FB: 91,
  NCAA_BB: 92,
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
  if (users.find(u => u.email === email)) return res.json({ success: false, error: "Email exists" });
  const newUser = {
    id: nextUserId++,
    email,
    password,
    balance: 0,
    bonus: 10, // give $10 instant bonus
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
  user.balance += 10; // $10 referral
  user.referralUsed = true;
  res.json({ success: true, balance: user.balance });
});

/* =========================
   FETCH ALL GAMES
========================= */
app.get("/games", async (req, res) => {
  try {
    let allGames = [];
    for (const [sport, id] of Object.entries(LEAGUES)) {
      const url = `https://www.mybookie.ag/odds/?l=${id}&o=E&lang=en/US&isXml=False`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data?.games) continue;
      const games = data.games.map(game => ({
        sport,
        gameId: game.id,
        matchup: game.name,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        startTime: game.startTime,
        lines: game.lines || game.odds,
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
   PLACE BET (TRACK SLIP)
========================= */
app.post("/place-bet", (req, res) => {
  const { userId, slip } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) return res.json({ success: false, error: "User not found" });

  // Check bonus balance first
  let totalStake = slip.reduce((a, b) => a + b.amount, 0);
  let bonusUsed = 0;
  if (user.bonus > 0) {
    bonusUsed = Math.min(user.bonus, totalStake);
    user.bonus -= bonusUsed;
    totalStake -= bonusUsed;
  }

  if (user.balance < totalStake) return res.json({ success: false, error: "Insufficient funds" });

  user.balance -= totalStake;
  user.slips.push({ slip, bonusUsed, timestamp: new Date() });
  res.json({ success: true, slipTracked: true, redirect: process.env.AFFILIATE_LINK });
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => console.log(`🚀 TicketTime backend running on ${PORT}`));

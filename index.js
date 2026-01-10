import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

const API_KEY = process.env.SPORTS_ODDS_API_KEY;

app.use(express.json());

/* =========================
   ROOT
========================= */
app.get("/", (req, res) => {
  res.send("TicketTime backend running ✅");
});

/* =========================
   ODDS (LIVE GAMES)
========================= */
app.get("/odds", async (req, res) => {
  try {
    const sport = req.query.sport || "basketball_nba";

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=us&markets=h2h&apiKey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const games = data.map(game => ({
      gameId: game.id,
      matchup: `${game.home_team} vs ${game.away_team}`,
      startTime: game.commence_time,
      league: sport
    }));

    res.json({ success: true, games });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================
   PLAYER PROPS (TODAY ONLY)
========================= */
app.get("/player-props", async (req, res) => {
  try {
    const sport = req.query.sport || "basketball_nba";

    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?regions=us&markets=player_points,player_rebounds,player_assists&apiKey=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const props = [];

    data.forEach(game => {
      game.bookmakers?.forEach(book => {
        book.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            props.push({
              game: `${game.home_team} vs ${game.away_team}`,
              gameId: game.id,
              player: outcome.description,
              stat: market.key,
              line: outcome.point,
              odds: outcome.price
            });
          });
        });
      });
    });

    res.json({ success: true, count: props.length, playerProps: props });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`TicketTime backend live on port ${PORT}`)
);

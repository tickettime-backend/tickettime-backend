import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 10000;

// Log server's public IP for MyBookie whitelisting
fetch("https://api.ipify.org?format=json")
  .then(res => res.json())
  .then(data => console.log("Server public IP:", data.ip))
  .catch(err => console.error(err));

// Root route
app.get("/", (req, res) => {
  res.send("TicketTime backend is running!");
});

// Optional: route to check IP via browser
app.get("/ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch IP" });
  }
});

// ===== /test-odds route =====
app.get("/test-odds", async (req, res) => {
  try {
    const response = await fetch("https://www.mybookie.ag/odds/", {
      headers: {
        "User-Agent": "TicketTime-Backend",
        "Accept": "application/json"
      }
    });

    const text = await response.text();

    res.status(response.status).send({
      status: response.status,
      bodyPreview: text.substring(0, 500)
    });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});
// ======================================

// ===== /odds route =====
app.get("/odds", async (req, res) => {
  try {
    const response = await fetch("https://www.mybookie.ag/odds/", {
      headers: {
        "User-Agent": "TicketTime-Backend",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch odds" });
    }

    const data = await response.json();

    const formattedOdds = [];

    data.data.forEach(group => {
      if (group.children) {
        group.children.forEach(league => {
          if (league.children) {
            league.children.forEach(item => {
              if (item.type === "league_link") {
                formattedOdds.push({
                  league: league.display_name,
                  name: item.display_name,
                  url: item.url
                });
              }
            });
          }
        });
      }
    });

    res.json({
      success: true,
      odds: formattedOdds
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching odds" });
  }
});
// ======================================

// ===== /player-props route =====
app.get("/player-props", async (req, res) => {
  try {
    const response = await fetch("https://www.mybookie.ag/odds/", {
      headers: {
        "User-Agent": "TicketTime-Backend",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch player props" });
    }

    const data = await response.json();

    const playerProps = [];

    data.data.forEach(group => {
      if (group.children) {
        group.children.forEach(league => {
          if (league.children) {
            league.children.forEach(item => {
              if (item.type === "league_link" && item.children) {
                item.children.forEach(game => {
                  if (game.children) {
                    game.children.forEach(prop => {
                      if (prop.type === "player_prop") {
                        playerProps.push({
                          league: league.display_name,
                          game: game.display_name,
                          player: prop.player_name,
                          stat: prop.stat_name,
                          overUnder: prop.over_under,
                          oddsOver: prop.odds_over,
                          oddsUnder: prop.odds_under
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    res.json({
      success: true,
      playerProps
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching player props" });
  }
});
// ======================================

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

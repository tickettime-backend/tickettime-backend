import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 10000;

// =====================
// Log server public IP
// =====================
fetch("https://api.ipify.org?format=json")
  .then(res => res.json())
  .then(data => console.log("Server public IP:", data.ip))
  .catch(err => console.error(err));

// =====================
// Root route
// =====================
app.get("/", (req, res) => {
  res.send("TicketTime backend is running!");
});

// =====================
// Optional: check server IP via browser
// =====================
app.get("/ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch IP" });
  }
});

// =====================
// /test-odds route
// =====================
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
      bodyPreview: text.substring(0, 500) // first 500 characters
    });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// =====================
// /odds route
// =====================
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

// =====================
// /player-props route
// =====================
app.get("/player-props", async (req, res) => {
  try {
    // 1️⃣ Fetch main feed
    const mainResp = await fetch("https://www.mybookie.ag/odds/", {
      headers: {
        "User-Agent": "TicketTime-Backend",
        "Accept": "application/json"
      }
    });

    if (!mainResp.ok) {
      return res.status(mainResp.status).json({ error: "Failed to fetch main feed" });
    }

    const mainData = await mainResp.json();
    const leagueLinks = [];

    // 2️⃣ Collect league URLs
    mainData.data.forEach(group => {
      if (group.children) {
        group.children.forEach(league => {
          if (league.children) {
            league.children.forEach(item => {
              if (item.type === "league_link" && item.url) {
                leagueLinks.push({
                  league: league.display_name,
                  url: "https://www.mybookie.ag/" + item.url
                });
              }
            });
          }
        });
      }
    });

    const playerProps = [];

    // 3️⃣ Fetch each league for actual player props
    for (const link of leagueLinks) {
      try {
        const resp = await fetch(link.url, {
          headers: {
            "User-Agent": "TicketTime-Backend",
            "Accept": "application/json"
          }
        });

        if (!resp.ok) continue;

        const data = await resp.json();

        if (data.data) {
          data.data.forEach(game => {
            if (game.children) {
              game.children.forEach(market => {
                if (market.type === "player_prop" && market.outcomes) {
                  market.outcomes.forEach(outcome => {
                    playerProps.push({
                      league: link.league,
                      game: game.display_name,
                      player: market.player_name || outcome.player_name,
                      stat: market.stat_name || outcome.stat_name,
                      overUnder: market.over_under || outcome.over_under,
                      oddsOver: outcome.odds_over || outcome.odds,
                      oddsUnder: outcome.odds_under || outcome.odds
                    });
                  });
                }
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching league ${link.url}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      playerProps
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching player props" });
  }
});

// =====================
// Start server
// =====================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

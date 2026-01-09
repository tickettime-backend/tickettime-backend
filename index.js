// ===== /player-props route =====
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
        console.error("Error fetching league", link.url, err.message);
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

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
  console.error("Error fetching league " + link.url + ": " + err.message);
}

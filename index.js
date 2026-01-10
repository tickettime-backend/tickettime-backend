app.get("/player-props", async (req, res) => {
  try {
    const eventId = req.query.eventId || "";
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/odds${
      eventId ? `?eventId=${eventId}` : ""
    }&bookmakers=Bet365,Pinnacle,Betfair Sportsbook,Betfair Exchange,Betsson,1xbet`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
    });

    const data = await response.json();

    if (!data || !data.data) {
      return res.json({ success: true, count: 0, playerProps: [] });
    }

    const props = [];

    Object.values(data.data).forEach(event => {
      const gameDate = new Date(event.startTime || event.commence_time);
      const today = new Date();
      if (gameDate.toDateString() !== today.toDateString()) return;

      if (!event.bookmakers || event.bookmakers.length === 0) return;

      event.bookmakers.forEach(book => {
        if (!book.markets || book.markets.length === 0) return;

        book.markets.forEach(market => {
          if (!market.outcomes || market.outcomes.length === 0) return;

          market.outcomes.forEach(outcome => {
            props.push({
              game: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
              gameId: event.id,
              player: outcome.description || "N/A",
              stat: market.key || "N/A",
              line: outcome.point || "N/A",
              odds: outcome.price || "N/A",
              sportsbook: book.title || "N/A",
              overUnder: null
            });
          });
        });
      });
    });

    res.json({ success: true, count: props.length, playerProps: props });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

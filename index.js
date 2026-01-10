/* =========================
   PLAYER PROPS (TODAY ONLY)
========================= */
app.get("/player-props", async (req, res) => {
  try {
    const sport = req.query.sport || "basketball_nba";
    const url = `https://odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com/v2/playerprops?sport=${sport}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "odds-api-io-real-time-sports-betting-odds-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY
      }
    });

    const data = await response.json();

    if (!data || !data.data) return res.json({ success: true, count: 0, playerProps: [] });

    const today = new Date().toDateString();

    const props = Object.values(data.data)
      .filter(prop => new Date(prop.commenceTime).toDateString() === today)
      .map(prop => ({
        gameId: prop.eventId,
        game: `${prop.homeTeam} vs ${prop.awayTeam}`,
        player: prop.player,
        stat: prop.stat,
        line: prop.line,
        odds: prop.odds,
        sportsbook: prop.bookmaker,
        overUnder: prop.overUnder || null
      }));

    res.json({ success: true, count: props.length, playerProps: props });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

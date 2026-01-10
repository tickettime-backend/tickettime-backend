import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY; // Put your RapidAPI key here

app.use(express.json());

/* =========================
   PLAYER PROPS (RAPIDAPI)
========================= */
app.get("/player-props", async (req, res) => {
  try {
    const eventId = req.query.eventId; // optional: pass an eventId to filter
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

    // Flatten the data into player props
    const props = [];

    Object.values(data.data).forEach(event => {
      event.bookmakers?.forEach(book => {
        book.markets?.forEach(market => {
          market.outcomes?.forEach(outcome => {
            props.push({
              game: event.name || `${event.homeTeam} vs ${event.awayTeam}`,
              gameId: event.id,
              player: outcome.description,
              stat: market.key,
              line: outcome.point,
              odds: outcome.price,
              sportsbook: book.title || null,
              overUnder: null,
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

app.listen(PORT, () => console.log(`TicketTime backend live on port ${PORT}`));

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
      bodyPreview: text.substring(0, 500) // first 500 characters
    });
  } cat

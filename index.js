"scripts": {
  "start": "node index.js"
}const fetch = require("node-fetch"); // make sure node-fetch is installed

// Log server's public IP for MyBookie whitelisting
fetch("https://api.ipify.org?format=json")
  .then(res => res.json())
  .then(data => console.log("Server public IP:", data.ip))
  .catch(err => console.error(err));

// Your existing code below
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("TicketTime backend is running!");
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Ticket Time backend is live");
});

app.get("/ip", async (req, res) => {
  const response = await fetch("https://api.ipify.org?format=json");
  const data = await response.json();
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

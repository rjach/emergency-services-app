const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());

app.get("/maps", (req, res) => {
  res.json({
    scriptUrl: `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&callback=initMap`,
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
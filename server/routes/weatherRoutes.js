const express = require("express");
const { getCurrentWeather } = require("../services/weather");

const router = express.Router();

router.get("/", async (req, res) => {
  res.json(await getCurrentWeather(req.query.city));
});

module.exports = router;
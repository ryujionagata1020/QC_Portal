const PORT = process.env.PORT;
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.end("hello world");
});

app.listen(PORT, () => {
  console.log(`Application listening at ${PORT}`);
});

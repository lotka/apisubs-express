const path = require("path");
const express = require("express");
const serveIndex = require("serve-index");
const app = express();
const PORT = 8080;
const ROOT = path.join(__dirname, "public");

app.use((_, res, next) => {
  res.append("Cross-Origin-Opener-Policy", "same-origin");
  res.append("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(express.static(ROOT));
// app.use("/", serveIndex(ROOT));

// Serve your specific page for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "/index.html"));
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

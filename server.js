const path = require("path");
const express = require("express");
const serveIndex = require("serve-index");
const app = express();
const PORT = 8081;
const ROOT = path.join(__dirname, "public");
var mode = 'prod';

app.use((_, res, next) => {
  res.append("Cross-Origin-Opener-Policy", "same-origin");
  res.append("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(express.static(ROOT));
// app.use("/", serveIndex(ROOT));

if(process.argv.length > 1) {
  if(process.argv[2] == 'dev') {
    mode = 'dev'
    console.log('dev mode')
  }
}
app.get("/env.js", (req, res) => {
  res.type('application/javascript');
  res.send(`const mode = '${mode}';`);
});

// Serve your specific page for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "/index.html"));
});

// Serve your specific page for the root route
app.get("/audio-extractor", (req, res) => {
  res.sendFile(path.join(ROOT, "/audio-extractor.html"));
});

// Serve your specific page for the root route
app.get("/api-transcribe", (req, res) => {
  res.sendFile(path.join(ROOT, "/api-transcribe.html"));
});

// Serve your specific page for the root route
app.get("/api-transcribe-groq", (req, res) => {
  res.sendFile(path.join(ROOT, "/api-transcribe-groq.html"));
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

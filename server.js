const path = require("path");
const express = require("express");
const serveIndex = require("serve-index");
const app = express();
const PORT = 8080;
const ROOT = path.join(__dirname, "public");
var mode = 'prod';

const YTDlpWrap = require('yt-dlp-wrap').default;

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

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "/index.html"));
});

app.get("/audio-extractor", (req, res) => {
  res.sendFile(path.join(ROOT, "/audio-extractor.html"));
});

app.get("/api-transcribe", (req, res) => {
  res.sendFile(path.join(ROOT, "/api-transcribe.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(ROOT, "/api-transcribe-groq.html"));
});

app.get("/api-transcribe-groq", (req, res) => {
  res.sendFile(path.join(ROOT, "/api-transcribe-groq.html"));
});

app.get('/api/yt-dlp', (req, res) => {
  const ytDlpWrap = new YTDlpWrap('./yt-dlp');
  const videoURL = req.query.url; // Get the YouTube URL from the query parameters
  let ytDlpEventEmitter = ytDlpWrap
  .execStream([
      videoURL,
      '-f',
      'best[ext=mp4]',
  ])
  // .on('progress', (progress) =>
  //     console.log(
  //         progress.percent,
  //         progress.totalSize,
  //         progress.currentSpeed,
  //         progress.eta
  //     )
  // )
  .on('ytDlpEvent', (eventType, eventData) =>
      console.log(eventType, eventData)
  )
  .on('error', (error) => console.error(error))
  .on('close', () => console.log('all done'));
  console.log(res)
  res.setHeader('Content-Type', 'video/mp4');
  ytDlpEventEmitter.pipe(res);

  // console.log(ytDlpEventEmitter.ytDlpProcess.pid);

  // if (!videoURL) {
  //     return res.status(400).json({ error: 'Missing YouTube URL' });
  // }

  // res.json({ message: 'Received YouTube URL', url: videoURL, videoPath : outputPath});
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

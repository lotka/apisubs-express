const path = require("path");
const express = require("express");
const net = require("net");
const serveIndex = require("serve-index");
const app = express();
const PORT = 8081;
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

const isPrivateIPv4 = (hostname) => {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
};

const isPrivateIPv6 = (hostname) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

const validateVideoURL = (rawURL) => {
  if (typeof rawURL !== "string" || rawURL.trim() === "") {
    return { error: "Missing video URL" };
  }

  let parsedURL;
  try {
    parsedURL = new URL(rawURL.trim());
  } catch {
    return { error: "Enter a valid video URL" };
  }

  if (!["http:", "https:"].includes(parsedURL.protocol)) {
    return { error: "Video URL must start with http:// or https://" };
  }

  const hostname = parsedURL.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return { error: "Localhost URLs are not allowed" };
  }

  const ipVersion = net.isIP(hostname);
  if ((ipVersion === 4 && isPrivateIPv4(hostname)) || (ipVersion === 6 && isPrivateIPv6(hostname))) {
    return { error: "Local or private network URLs are not allowed" };
  }

  return { url: parsedURL.href };
};

app.get('/api/yt-dlp', (req, res) => {
  const ytDlpWrap = new YTDlpWrap('./yt-dlp');
  const validation = validateVideoURL(req.query.url);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const videoURL = validation.url;
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
  .on('error', (error) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(502).json({ error: "Could not download video from that URL" });
      } else {
        res.destroy(error);
      }
  })
  .on('close', () => console.log('all done'));
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

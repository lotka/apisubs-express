const tar = require("tar");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const YTDlpWrap = require('yt-dlp-wrap').default;

const NPM_URL = "https://registry.npmjs.org";
const ROOT = "public/assets";

const FFMPEG_VERSION = "0.12.7";
const UTIL_VERSION = "0.12.0";
const CORE_VERSION = "0.12.5";
const CORE_MT_VERSION = "0.12.5";

const FFMPEG_TGZ = `ffmpeg-${FFMPEG_VERSION}.tgz`;
const UTIL_TGZ = `util-${UTIL_VERSION}.tgz`;
const CORE_TGZ = `core-${CORE_VERSION}.tgz`;
const CORE_MT_TGZ = `core-mt-${CORE_MT_VERSION}.tgz`;

const FFMPEG_TGZ_URL = `${NPM_URL}/@ffmpeg/ffmpeg/-/${FFMPEG_TGZ}`;
const UTIL_TGZ_URL = `${NPM_URL}/@ffmpeg/util/-/${UTIL_TGZ}`;
const CORE_TGZ_URL = `${NPM_URL}/@ffmpeg/core/-/${CORE_TGZ}`;
const CORE_MT_TGZ_URL = `${NPM_URL}/@ffmpeg/core-mt/-/${CORE_MT_TGZ}`;

const mkdir = (dir) => {
  !fs.existsSync(dir) && fs.mkdirSync(dir);
};

const downloadAndUntar = async (url, tgzName, dst) => {
  const dir = `${ROOT}/${dst}`;
  if (fs.existsSync(dir)) {
    console.log(`found @ffmpeg/${dst} assets.`);
    return;
  }
  console.log(`download and untar ${url}`);
  mkdir(dir);
  const data = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(tgzName, data);

  await tar.x({ file: tgzName, C: `${ROOT}/${dst}` });
  fs.unlinkSync(tgzName);
};

const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

const downloadYTDLP = async () => {
  if (fs.existsSync('yt-dlp')) {
    console.log(`found yt-dlp assets.`);
    return;
  } else {
    console.log('Downloading yt-dlp...');

    try {
      await YTDlpWrap.downloadFromGithub();
      console.log('yt-dlp downloaded successfully.');
    } catch (error) {
      console.error('Error downloading yt-dlp:', error);
    }
  }
  // Fallback method to download yt-dlp
  if (fs.existsSync('yt-dlp')) {
    console.log(`found yt-dlp assets.`);
    return;
  } else {
  try {
      const filePath = path.join(__dirname, "yt-dlp");
      execSync(`wget -O ${filePath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp`, { stdio: "inherit" });
      execSync(`chmod +x ${filePath}`);
      console.log("yt-dlp downloaded with fallback method.");
    } catch (error) {
      console.error('Error downloading yt-dlp with fallback method:', error);
    }
  }
};

mkdir(ROOT);
downloadAndUntar(FFMPEG_TGZ_URL, FFMPEG_TGZ, "ffmpeg");
downloadAndUntar(UTIL_TGZ_URL, UTIL_TGZ, "util");
downloadAndUntar(CORE_TGZ_URL, CORE_TGZ, "core");
downloadAndUntar(CORE_MT_TGZ_URL, CORE_MT_TGZ, "core-mt");
downloadYTDLP();
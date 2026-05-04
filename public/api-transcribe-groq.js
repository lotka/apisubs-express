import {srtToVtt, convertToSrt} from "./utils.js";
const { fetchFile } = FFmpegUtil;
const { FFmpeg } = FFmpegWASM;
let ffmpeg = null;
let currentSRTFile = null;
const test_subs = {"task":"transcribe","language":"English","duration":20.7,"text":" The idea, the idea that corporate-owned housing is able to raise your rent, three, 400 bucks a month or something under, and I'm about to announce they can't raise it more than $55.","segments":[{"id":0,"seek":0,"start":0,"end":6.4,"text":" The idea, the idea that corporate-owned housing is able to raise your rent,","tokens":[50365,440,1558,11,264,1558,300,10896,12,14683,6849,307,1075,281,5300,428,6214,11,50685],"temperature":0,"avg_logprob":-0.23285496,"compression_ratio":1.3211678,"no_speech_prob":0.026396155},{"id":1,"seek":0,"start":7.02,"end":8.64,"text":" three, 400 bucks a month or something under,","tokens":[50716,1045,11,8423,11829,257,1618,420,746,833,11,50797],"temperature":0,"avg_logprob":-0.23285496,"compression_ratio":1.3211678,"no_speech_prob":0.026396155},{"id":2,"seek":0,"start":9.54,"end":16.14,"text":" and I'm about to announce they can't raise it more than $55.","tokens":[50842,293,286,478,466,281,7478,436,393,380,5300,309,544,813,1848,13622,13,51172],"temperature":0,"avg_logprob":-0.23285496,"compression_ratio":1.3211678,"no_speech_prob":0.026396155}],"x_groq":{"id":"req_01j74va6c9et6vef3fwsm1a2qe"}}
const test_subs_srt = '00:00:00,000 --> 00:00:07,240\n' + 'These are test subtitles,\n' + '\n' + '2\n' +'00:00:07,240 --> 00:00:11,960\n' + 'so I can avoid calling the API to test the code\n' + '' + '3\n' + '00:00:11,960 --> 00:00:18,559\n' +'testing\n'

async function loadFFMPEG(ffmpeg, message) {
    message.innerHTML = 'Loading ffmpeg...';
    if (ffmpeg === null) {
        ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => {
            console.log(message);
        });
        ffmpeg.on("progress", ({ progress, time }) => {
            message.innerHTML = `Preparing file for transcription: ${progress * 100} %, time: ${time / 1000000} s`;
        });
        await ffmpeg.load({
            // coreURL: "/assets/core/package/dist/umd/ffmpeg-core.js",
            coreURL: "/assets/core-mt/package/dist/umd/ffmpeg-core.js",
        });
    }
    message.innerHTML = 'ffmpeg loaded. Opening file...';
    return ffmpeg
}

async function whisperAPI(data) {
    try {
        const provider = document.getElementById('provider').value;
        let message = null;
        if(provider == 'openai') {
            message = await openaiAPI(data);
        } else {
            message = await groqAPI(data);
        }
        message.textContent = 'Transcription complete, you can now download or preview the subtitles.';
        
        console.log(currentSRTFile)
        const subs_paragraph = document.getElementById('subs');
        subs_paragraph.style.whiteSpace = 'pre-wrap';
        subs_paragraph.textContent = currentSRTFile;

        return currentSRTFile;
    } catch (error) {
        console.error('Error during fetch:', error);
        throw error;
    }
}

const transcode = async (userVideo,mode) => {
    const message = document.getElementById('message');
    ffmpeg = await loadFFMPEG(ffmpeg,message);
    const name = 'userVideo.mp4';
    console.log(mode);
    if (mode=='upload') {
        await ffmpeg.writeFile(name, await fetchFile(userVideo[0]));
    } else {
        console.log(userVideo);
        const buffer = await userVideo.arrayBuffer();
        const videoData = new Uint8Array(buffer);
        await ffmpeg.writeFile(name, videoData);
    }
    message.innerHTML = 'Locally converting video to audio...';
    console.time('exec');
    await ffmpeg.exec(['-i', name, '-ar','16000', '-ac','1', '-map', '0:a', 'output.mp3',]);
    console.timeEnd('exec');
    message.innerHTML = 'Finished creating audio file';
    const orginal_video = await ffmpeg.readFile(name);
    const data = await ffmpeg.readFile('output.mp3');

    const subs = await whisperAPI(data);
    if (!subs) {
        throw new Error('No subtitles were returned from the transcription API');
    }
    const video = document.getElementById('output-video');
    URL.revokeObjectURL(video.src);
    video.src = "";
    video.src = URL.createObjectURL(new Blob([orginal_video.buffer], { type: 'video/mp4' }));

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'English';
    track.srclang = 'en';
    track.src = srtToVtt(subs);
    track.default = true;
    if (video.textTracks.length > 0) { 
        video.textTracks[0] = track
    } else {
        video.appendChild(track);
    }

    document.getElementById("output-video").style.display = "block";
    document.getElementById("downloadBtn").style.display = "block";
    document.getElementById('downloadBtn').addEventListener('click', function() {            
        // Create a Blob object with the content
        const blob = new Blob([currentSRTFile], { type: 'text/plain' });

        // Create a temporary link element
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = 'subs.srt'; // Filename for the download

        // Append the link to the document and trigger the download
        document.body.appendChild(link);
        link.click();

        // Clean up and remove the temporary link
        document.body.removeChild(link);
    });
}

const fileInput = document.getElementById('fileUpload');
const videoURL = document.getElementById('videoURL');
const button = document.getElementById('uploadButton');
const apiInputField = document.getElementById('api_key');
const errors = document.getElementById('errors');
const storageKey = 'api_key';
const storageAdvancedOptions = 'advancedOptions'

function showError(message) {
    errors.textContent = message;
    errors.classList.remove('d-none');
}

function clearError() {
    errors.textContent = '';
    errors.classList.add('d-none');
}

function getURLValidationError(rawURL) {
    if (rawURL.trim() === '') {
        return null;
    }

    let parsedURL;
    try {
        parsedURL = new URL(rawURL.trim());
    } catch {
        return 'Enter a valid video URL';
    }

    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
        return 'Video URL must start with http:// or https://';
    }

    return null;
}

// On page load, check if there is a saved value
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
        apiInputField.value = savedKey;
    }
});

var coll = document.getElementsByClassName("collapsible");

for (let i = 0; i < coll.length; i++) {
  // Load saved state
  let savedState = localStorage.getItem("collapsible_" + i);
  console.log(savedState);
  if (savedState === "open") {
    coll[i].classList.add("active");
    let content = coll[i].nextElementSibling;
    content.style.display = "block";
  }

  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    let content = this.nextElementSibling;

    if (content.style.display === "block") {
      content.style.display = "none";
      localStorage.setItem("collapsible_" + i, "closed");
    } else {
      content.style.display = "block";
      localStorage.setItem("collapsible_" + i, "open");
    }
  });
}

button.addEventListener('click', async (event) => {
    event.preventDefault();
    clearError();

    var mode = null;
    var transcoding_input = null;

    // Check for errors before starting
    if ((fileInput.files.length === 0) && (videoURL.value.length === 0)) {
        console.log(fileInput.files.length)
        console.log(videoURL.value.length)
        showError('No video given');
        return;
    }
    const urlValidationError = getURLValidationError(videoURL.value);
    if (urlValidationError) {
        showError(urlValidationError);
        return;
    }
    if (document.getElementById('api_key').value === '') {
        showError('No API key');
        return;
    }

    // Disable the button and change text
    button.disabled = true;
    const originalButtonText = button.textContent;
    button.textContent = 'Transcribing...';

    if (fileInput.files.length > 0) {
        mode = 'upload';
        transcoding_input = fileInput.files;
    }
    if (videoURL.value.length > 0) {
        mode = 'yt-dlp';
    }

    // If there are errors, don't proceed
    if (errors.textContent !== '') {
        return;
    }

    try {
        if (mode === 'yt-dlp') {
            transcoding_input = await fetch(`/api/yt-dlp?url=${encodeURIComponent(videoURL.value)}`);
            if (!transcoding_input.ok) {
                const errorResponse = await transcoding_input.json().catch(() => null);
                throw new Error(errorResponse?.error || `Could not download video. Status: ${transcoding_input.status}`);
            }
        }

        // Perform the transcription
        console.log(mode)
        await transcode(transcoding_input,mode);
        
        // Optionally, show a success message
        console.log('Transcription complete!');
    } catch (error) {
        // Handle any errors
        showError(error.message || 'An error occurred during transcription');
        console.error('Transcription error:', error);
    } finally {
        // Re-enable the button and restore original text
        document.getElementById('fileUpload').value = '';
        document.getElementById('videoURL').value = '';
        button.disabled = false;
        button.textContent = originalButtonText;
    }
    // save key for next time
    if(storageKey) {
        localStorage.setItem(storageKey, apiInputField.value);
    }
});

async function groqAPI(data) {
    const message = document.getElementById('message');
    message.innerHTML = 'Sending audio to groq transcription API...';
    const language = document.getElementById('language').value;
    const formData = new FormData();
    formData.append('file', new Blob([data.buffer], { type: 'audio/mpeg' }), 'output.mp3');
    if (language == 'en') {
        formData.append('model', 'whisper-large-v3-turbo');
    } else {
        formData.append('model', 'whisper-large-v3');
    }
    formData.append('temperature', '0');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    if (mode == 'prod') {
        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ` + document.getElementById('api_key').value,
            },
            body: formData
        });

        message.innerHTML = 'Waiting for response from groq...';
        const jsonResponse = await response.json();
        if (!response.ok) {
            var error = `Transcription API error! Status: ${response.status}. Did you enter a valid groq API key?`;
            message.textContent = error;
            throw new Error(error);
        }


        currentSRTFile = convertToSrt(jsonResponse['segments']);
    } else {
        currentSRTFile = convertToSrt(test_subs['segments']);
    }
    return message;
}

async function openaiAPI(data) {
    const message = document.getElementById('message');
    message.innerHTML = 'Sending audio to OpenAI transcription API...';

    const formData = new FormData();
    formData.append('file', new Blob([data.buffer], { type: 'audio/mpeg' }), 'output.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', document.getElementById('language').value);
    formData.append('response_format', 'srt');
        if(mode == 'prod')
        {
          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ` +  document.getElementById('api_key').value,
                
            },
            body: formData
          });
    
          message.innerHTML = 'Waiting for response from OpenAI...';
    
          if (!response.ok) {
              var error = `Transcription API error! Status: ${response.status}. Did you enter a valid OpenAI API key?`;
              message.textContent = error;
              throw new Error(error);
          }
    
    
          currentSRTFile = await response.text();
        } else {
          currentSRTFile = test_subs_srt;
        }
    return message;
    }

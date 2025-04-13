// Function to convert float seconds to SRT timestamp
export function secondsToSrtTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const secs = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
    return `${hours}:${minutes}:${secs},${milliseconds}`;
}

// Function to convert data to SRT format
export function convertToSrt(data) {
    return data.map((item, index) => {
        const startTime = secondsToSrtTime(item.start);
        const endTime = secondsToSrtTime(item.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
    }).join('\n');
}

export function srtToVtt(data) {
    let vtt = 'WEBVTT\n\n';
    vtt += data
        .replace(/^\d+$/gm, '')
        .replace(/,/g, '.')
        .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1.$2')
        // Remove the extra dot in timestamps
        .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})\.(\d{3})/g, '$1.$2');
    console.log("Converted VTT:", vtt);
    const subtitleBlob = new Blob([vtt], { type: 'text/vtt' });
    return URL.createObjectURL(subtitleBlob);
}

export function loadTextFile(filePath) {
    return fetch(filePath)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .catch(error => {
        console.error('Error loading the file:', error);
        throw error;
      });
  }
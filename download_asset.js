const fs = require('fs');
const https = require('https');
const path = require('path');

const fileUrl = 'https://www.soundjay.com/buttons/button-09.mp3';
const dest = path.join(__dirname, 'assets', 'click.mp3');

console.log(`Downloading from ${fileUrl} to ${dest}`);

const file = fs.createWriteStream(dest);
const request = https.get(fileUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
}, function (response) {
    if (response.statusCode !== 200) {
        console.error(`Failed to download: status code ${response.statusCode}`);
        file.close();
        fs.unlink(dest, () => { });
        return;
    }
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => console.log('Download completed.'));
    });
}).on('error', function (err) {
    fs.unlink(dest, () => { });
    console.error('Error downloading file:', err);
});

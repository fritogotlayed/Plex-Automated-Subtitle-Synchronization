const md5File = require('md5-file/promise');
const download = require('download');
const got = require('got');
const OS = require('opensubtitles-api');
const crypto = require('crypto');
const util = require('util');
const fs = require('fs');
const path = require('path');

const diffHumanReadable = (dt1, dt2) => {
  // get total seconds between the times
  let delta = Math.abs(dt1 - dt2) / 1000;

  // calculate (and subtract) whole days
  let days = Math.floor(delta / 86400);
  delta -= days * 86400;

  // calculate (and subtract) whole hours
  let hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;

  // calculate (and subtract) whole minutes
  let minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  // what's left is seconds
  let seconds = Math.floor(delta % 60); // in theory the modulus is not required

  let output = '';
  if (days) {
    output += `${days}d `
  }

  if (hours) {
    output += `${hours}h `
  }

  if (minutes) {
    output += `${minutes}m `
  }

  output += `${seconds}s`

  return output;
};


const debugHashFile = (file) => {
  const start = new Date();
  return md5File(file)
    .then((hash) => console.log(`Name: ${file}\nHash: ${hash}\nTime: ${diffHumanReadable(start, new Date())}`))
    .catch((err) => console.dir(err));
};

const testGetFileHash = () => {
  const files = [
    '/mnt/XBMC/TV\ Shows/Star\ Trek\ Enterprise/Season\ 1/01\ -\ Broken\ Bow.m4v',
    '/home/malline/Videos/Star\ Trek\ Enterprise/Season\ 1/01\ -\ Broken\ Bow.m4v',
    '/home/malline/Videos/Star\ Trek\ Voyager/Season\ 1/01\ -\ Caretaker.m4v',
  ];

  return Promise.all(
    files.map(f => debugHashFile(f))
  );
};

const testDownloadFile = () => {
  // const url = 'http://ipv4.download.thinkbroadband.com/200MB.zip'
  // const out = 'output.zip'
  const url = 'https://dl.opensubtitles.org/en/download/src-api/vrf-19ad0c58/sid-BfZNJD,G6OpUL3CFqL3B4qZd5,4/file/1951730588';
  const out = 'Star.Trek.Enterprise.S01E01E02.Broken.Bow.WS.AC3.DVDRip.XviD-MEDiEVAL.en.srt'
  return download(url, '.', { filename: out })
    .then(() => console.log('done'));
};

const testPlexNowPlaying = () => {
  const url = 'http://192.168.5.90:32400/status/sessions';
  const headers = { headers: { 'Accept': 'application/json'} }
  return got(url, headers)
    .then((resp) => resp.body)
    .then((body) => console.dir(JSON.parse(body), { depth: 10 }))
};

const testSubtitlesSearch = () => {
  // const md5pass = crypto.createHash('md5').update('3Pupal-0trail-Swart0-array').digest('hex')
  const md5pass = '3Pupal-0trail-Swart0-array';
  const OpenSubtitles = new OS({
    useragent: 'PASSAgent',
    username: 'fritogotlayed',
    password: md5pass,
    ssl: true
 });
 return OpenSubtitles.login()
  .then((res) => {
    console.log(`Token: ${res.token}`)
  })
  .then(() => {
    return OpenSubtitles.search({
      sublanguageid: 'en',
      query: 'enterprise broken bow'
    });
  })
  .then((results) => console.dir(results.en, { depth: 10 }))
  .catch((err) => console.dir(err, { depth: 5 }));
};

const testScanDirectory = () => {
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  const parts = [
    '/mnt/XBMC',
    'TV Shows',
    'The Big Bang Theory',
  ];

  return readdir(path.join(...parts))
    .then((contents) => {
      const ignoreDirs = [
        '#recycle',
        '@eaDir',
        '.actors',
        'extrafanart',
      ];
      const filterDirs = (name) => ignoreDirs.indexOf(name) === -1;

      const children = contents
        .filter(filterDirs)
        .map((e) => lstat(path.join(...parts, e)).then((r) => ({ path: e, stats: r })));

      return Promise.all(children)
        .then((items) => {
          const ignoreExtensions = [ '.nfo', '.jpg', '.srt', '.png', '.db' ];
          const filterFile = (name) => {
            const ignored = ignoreExtensions.some((v) => name.path.indexOf(v) !== -1);
            console.dir({ path: name.path, ignored});
            return !ignored;
          };
          /*
          const filterFile = (name) => {
            const safe = supportedVideoExtensions.some((v) => name.path.indexOf(v) !== -1);
            // console.dir({ path: name.path, safe});
            return safe;
          };
          */
          const directories = items.filter((e) => e.stats.isDirectory()).map((e) => e.path);
          const files = items.filter((e) => e.stats.isFile())
            .filter(filterFile)
            .map((e) => e.path);

          return {
            directories,
            files
          };
        });
    })
    .then((body) => console.dir(body, { depth: 10 }))
    .catch((err) => {
      console.dir(err);
    });
};

// const main = () => testGetFileHash();
// const main = () => testDownloadFile();
// const main = () => testPlexNowPlaying();
// const main = () => testSubtitlesSearch();
const main = () => testScanDirectory();

main();

// https://www.npmjs.com/package/subtitle <-- To adjust sub titles. parse -> resync -> stringify
// https://stackoverflow.com/questions/12941083/execute-and-get-the-output-of-a-shell-command-in-node-js
//    ffmpeg -i /XBMC/TV\ Shows/Star\ Trek\ Enterprise/Season\ 1/01\ -\ Broken\ Bow.m4v 2>&1 | sed -n "s/.*, \(.*\) fp.*/\1/p"

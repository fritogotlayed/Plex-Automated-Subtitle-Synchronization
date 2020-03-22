const _ = require('lodash');
const fileDiscovery = require('./file-discovery');
const mdsSdk = require('@maddonkeysoftware/mds-sdk-node');
const path = require('path');
const md5File = require('md5-file/promise');
const { GraphQLClient } = require('graphql-request');

const graphQLClient = new GraphQLClient(process.env.MDS_PASS_URL);

const diffBetweenTimestamps = (dt1, dt2) => {
  // get total seconds between the times
  let delta = Math.abs(dt2 - dt1) / 1000;

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

  return {
    days,
    hours,
    minutes,
    seconds
  };
};

const diffHumanReadable = (dt1, dt2) => {
  const { days, hours, minutes, seconds } = diffBetweenTimestamps(dt1, dt2);

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

const enqueueFiles = (queueName, metadata, type) => {
  // directory, subDirectories, files
  const qsClient = mdsSdk.getQueueServiceClient();

  return Promise.all(metadata.subDirectories.map(d => enqueueFiles(queueName, d)))
    .then(() => Promise.all(metadata.files.map(f => qsClient.enqueueMessage(queueName, { file: path.join(metadata.directory, f.name), type }))))
};

const parsePathForMovieName = (filePath) => {
  const regex = new RegExp(/.*\/(.*) \(\d{4}\)\..{3,}/g);
  let input = filePath;
  let matches = regex.exec(input);
  if (matches) {
    return matches[1];
  } else {
    let regex2 = /.*\/(.*)\..{3,}/g;
    matches = regex2.exec(input);
    return matches[1];
  }
}

const getMovieId = (filePath) => {
  const filter = parsePathForMovieName(filePath);
  const query = `query {
    searchMovie(filter: "${filter}") {
      title
      imdbID
      year
    }
  }`;
  return graphQLClient.request(query)
    .then(resp => resp.searchMovie[0])
    .catch(err => console.dir(err));
}

const parsePathForShowDetails = (filePath) => {
  // https://regex101.com/r/3C4y9b/3/
  const regex = new RegExp(/.*\/(.*)\/Season (\d{0,5})\/(\d{0,5}) - .*\..{3,}|.*\/(.*)\/.*\.s(\d{0,5})e(\d{0,5})\..{3,}/g);
  let input = filePath;
  let matches = regex.exec(input);
  if (matches) {
    return {
      show: matches[1] || matches[4],
      season: Number(matches[2] || matches[5]),
      episode: Number(matches[3] || matches[6])
    };
  } else {
    // TODO: Implement
    let regex2 = /.*\/(.*)\..{3,}/g;
    matches = regex2.exec(input);
    return;
  }
}

const getEpisodeId = (filePath) => {
  const details = parsePathForShowDetails(filePath);
  if (!details) return Promise.reject('Could not determine show details.');

  const query = `query {
    searchShow(filter: "${details.show}") {
      id
    }
  }`;
  return graphQLClient.request(query)
    .then(resp => resp.searchShow[0])
    .catch(err => console.dir(err))
    .then((data) => {
      const query = `query {
        listShowEpisodes(id: ${data.id}) {
          id
          episodeName
          airedSeason
          airedEpisodeNumber
          dvdSeason
          dvdEpisodeNumber
        }
      }`;
      return Promise.all([ data.id, graphQLClient.request(query) ]);
    })
    .then(([ showId, resp ]) => {
      let predicate = { dvdSeason: Number(details.season), dvdEpisodeNumber: Number(details.episode) };
      let results = _.filter(resp.listShowEpisodes, predicate);

      if (results.length === 0) {
        predicate = { airedSeason: Number(details.season), airedEpisodeNumber: Number(details.episode) };
        results = _.filter(resp.listShowEpisodes, predicate);
      }

      return { showId, id: results[0].id };
    })
    .catch(err => console.dir(err));
};

const requestSubtitleFile = (meta) => {
  return Promise.resolve()
    .then(() => {
      switch (meta.type) {
        case 'show':
          return getEpisodeId(meta.file)
            .then(elem => `showId: ${elem.showId}, episodeId: ${elem.id}`);
        case 'movie':
          return getMovieId(meta.file)
            .then(elem => `movieId: "${elem.imdbID}"`);
        default:
          break;
      }
    })
    .then((identifierBlock) => {
      const query = `query {
        getSubtitles(mediaType: "${meta.type}", fileHash: "${meta.hash}", ${identifierBlock} ) {
          downloadPath
        }
      }`;
      return graphQLClient.request(query)
        .catch((err) => {
          if (_.get(err, 'response.errors[0].message') !== 'Could not locate suitable subtitle file.'){
            console.dir(err);
          }
        });
    })
}

const getFileHash = (filePath) => {
  //return md5File(filePath);
  return Promise.resolve('file hash skipped.');
}

const processQueue = (queueName, qsClient) => {
  const processMessage = (message) => {
    const msg = JSON.parse(message.message);
    return Promise.resolve(new Date())
      .then((start) => getFileHash(msg.file).then((hash) => ({ start, hash })))
      .then((meta) => { console.log(`${msg.file} [${diffHumanReadable(meta.start, new Date())}]: ${meta.hash}`); return meta; })
      .then((meta) => requestSubtitleFile(_.merge({}, meta, msg)))
      .catch((err) => console.dir(err))
      .then(() => message);
  };

  const deleteMessage = (message) => qsClient.deleteMessage(queueName, message.id)
    .then(() => true);

  return qsClient.fetchMessage(queueName)
    .then((message) => message ? processMessage(message) : undefined)
    .then((message) => message ? deleteMessage(message) : undefined)
    .then((processed) => processed ? processQueue(queueName, qsClient) : undefined);
};

const scanDirectory = (queue, dir) => fileDiscovery.scanDirectory(dir.path)
  .then((metadata) => enqueueFiles(queue, metadata, dir.type));

const scanDirectories = (queue, directories) => Promise.all(directories.map(d => scanDirectory(queue, d)));

const regexTest = () => {
  // https://regex101.com/r/Y9uI1L/1/
  let inputs = [
    '/mnt/XBMC/Movies/The Martian (2015).m4v',
    '/mnt/XBMC/Movies/The Martian.m4v',
    '/mnt/XBMC/Movies/21 (2012).m4v',
    '/mnt/XBMC/Movies/21.m4v',
  ]
  const regex = new RegExp(/.*\/(.*) \(\d{4}\)\..{3,}/g);
  for (let i = 0; i < inputs.length; i += 1) {
    let input = inputs[i];
    let matches = regex.exec(input);
    if (matches) {
      console.log(`1st regex matched. ${matches[1]} is title`)
    } else {
      let regex2 = /.*\/(.*)\..{3,}/g;
      matches = regex2.exec(input);
      console.log(`2nd regex matched. ${matches[1]} is title`)
    }
  }
};

const main = () => {
  mdsSdk.initialize({
    qsUrl: 'http://192.168.5.90:8081',
    smUrl: 'http://192.168.5.90:8082',
    fsUrl: 'http://192.168.5.90:8083'
  });
  const queueName = 'pass-agent-files-to-scan';
  const dirs = [
    { path: '/mnt/XBMC/TV Shows', type: 'show' },
    { path: '/mnt/XBMC/Movies', type: 'movie' }
  ];

  const qsClient = mdsSdk.getQueueServiceClient();
  return qsClient.createQueue(queueName)
    .catch(() => {})
    .then(() => qsClient.getQueueLength(queueName))
    .then((meta) => meta.size === 0 ? scanDirectories(queueName, dirs) : Promise.resolve())
    .then(() => processQueue(queueName, qsClient));
};

main();
// regexTest();

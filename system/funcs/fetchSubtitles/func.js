const os = require('os');
const fs = require('fs');
const util = require('util');
const fdk = require('@fnproject/fdk');
const mds = require('@maddonkeysoftware/mds-sdk-node');
const OS = require('opensubtitles-api');
const { GraphQLClient } = require('graphql-request');
const download = require('download');
const bunyan = require('bunyan');
const BunyanLogstashHttp = require('./bunyan-logstash-http');
const BATCH_SIZE = 10;

const qsClient = mds.getQueueServiceClient(process.env.MDS_QS_URL);
const fsClient = mds.getFileServiceClient(process.env.MDS_FS_URL);
const graphQLClient = new GraphQLClient(process.env.MDS_PASS_URL);
const OpenSubtitles = new OS({
  useragent: 'PASSAgent',
  username: process.env.PASS_OPEN_SUBTITLES_USER,
  password: process.env.PASS_OPEN_SUBTITLES_PASS,
  ssl: true
});

const fsDelete = util.promisify(fs.unlink);
const loggerMetadata = { func: 'fetchSubtitles', fromLocal: process.env.DEBUG };
const logger = bunyan.createLogger({
  name: 'fetchSubtitles',
  level: bunyan.TRACE,
  serializers: bunyan.stdSerializers,
  streams: [
    {
      stream: process.stdout
    },
    {
      stream: new BunyanLogstashHttp({
        loggingEndpoint: process.env.MDS_LOG_URL,
        level: 'debug',
        metadata: loggerMetadata
      }),
    }
  ]
});

const getQueueMessages = (messages) => {
  runningMessages = messages || [];
  return qsClient.fetchMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE)
    .then((message) => {
      if (message && message.id) {
        runningMessages.push(message)
        if (runningMessages.length < BATCH_SIZE) {
          return getQueueMessages(runningMessages);
        }
      }

      return runningMessages;
    });
}

const dequeueMessages = (messages) => {
  logger.debug('Cleaning up processed messages.');
  return Promise.all(messages.map((e) => qsClient.deleteMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE, e.id))).then(() => messages.length);
};

const findSubtitles = (query, language) => {
  return OpenSubtitles.search({
    sublanguageid: language,
    query
  })
    .then((results) => results[language]);
};

const obtainEpisodeMetadata = (episodeId) => {
  const query = `query {
    getEpisodeDetails(episodeId: ${episodeId}) {
      show { name }
      episodeName
      dvdEpisodeNumber
    }
  }`;
  return graphQLClient.request(query)
    .then(resp => resp.getEpisodeDetails);
};

const obtainMovieMetadata = (imdbId) => {
  const query = `query {
    getMovieDetails(imdbId: "${imdbId}") {
      title
      year
    }
  }`
  return graphQLClient.request(query)
    .then(resp => resp.getMovieDetails);
};

const generateOpenSubtitlesQuery = (metadata) => metadata.show ? `${metadata.show.name} ${metadata.episodeName}` : `${metadata.title}`;

const findAndStoreSubtitles = async (message) => {
  const args = JSON.parse(message.message);
  const { type, showId, episodeId, movieId, language, fileHash } = args;
  logger.trace({ metadata: args } , 'Beginning to process message');
  // console.dir(args);
  switch (type) {

    case 'show':
      const metadata = await obtainEpisodeMetadata(episodeId);
      if (metadata) {
        logger.trace({ metadata }, 'Show metadata obtained');
        const query = generateOpenSubtitlesQuery(metadata);
        const fileEpisodeNumber = ('0' + metadata.dvdEpisodeNumber).slice(-2);
        const containerPath = `${process.env.PASS_SUBTITLES_CONTAINER}/show/${showId}/${episodeId}/${language}`;

        const data = await findSubtitles(query, language);
        if (data) {
          logger.trace({ metadata: data }, 'Subtitle data obtained.');
          const filename = `${fileEpisodeNumber} - ${metadata.episodeName}.${data.format}`;
          const localFilePath = `${os.tmpdir()}/${filename}`;

          await download(data.url, os.tmpdir(), { filename });
          try {
            await fsClient.createContainer(containerPath);
          } catch {}
          await fsClient.uploadFile(containerPath, localFilePath);
          await fsDelete(localFilePath);
          return;
        } else {
          logger.info({ showMetadata: metadata, language }, 'Could not obtain subtitle data for show.');
        }
      }
      return;

    case 'movie':
      return obtainMovieMetadata(movieId)
        .then((metadata) => {
          logger.trace({ metadata }, 'Movie metadata obtained');
          const query = generateOpenSubtitlesQuery(metadata);
          const containerPath = `${process.env.PASS_SUBTITLES_CONTAINER}/movie/${movieId}/${language}`;

          return findSubtitles(query, language)
            .then((data) => {
              if (data) {
                logger.trace({ metadata: data }, 'Subtitle data obtained.');
                const filename = `${metadata.title} (${metadata.year}).${data.format}`;
                const localFilePath = `${os.tmpdir()}/${filename}`;

                return download(data.url, os.tmpdir(), { filename })
                  .then(() => fsClient.createContainer(containerPath))
                  .catch(() => {})
                  .then(() => fsClient.uploadFile(containerPath, localFilePath))
                  .then(() => fsDelete(localFilePath));
              } else {
                logger.info({ movieMetadata: metadata, language }, 'Could not obtain subtitle data for movie.');
              }
            })
        });

    default:
      throw new Error('Unknown media format');
  }
};

const processMessages = async (messages) => {
  const processedMessages = [];
  const failedMessages = [];
  logger.debug(`Processing ${messages.length} messages`);

  if (messages.length > 0) {
    await OpenSubtitles.login();
    for (let i = 0; i < messages.length; i += 1) {
      const e = messages[i];
      try {
        await findAndStoreSubtitles(e);
        processedMessages.push(e)
      } catch {
        failedMessages.push(e)
      }
    }
  }

  if (failedMessages.length > 0 && process.env.PASS_SUBTITLES_NEEDED_QUEUE_DLQ) {
    await Promise.all([
      failedMessages.map((e) => qsClient.enqueueMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE_DLQ, JSON.parse(e.message))),
      failedMessages.map((e) => qsClient.deleteMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE, e.id)),
    ]);

    logger.warn(`Successfully DLQ'd ${failedMessages.length} messages.`)
  }

  return processedMessages;
};

const handle = () => Promise.resolve(logger.info('Fetching messages to process.'))
  .then(() => process.env.PASS_SUBTITLES_NEEDED_QUEUE = 'pass-subtitles-needed-dlq')
  .then(() => getQueueMessages())
  .then((messages) => processMessages(messages))
  .then((messages) => dequeueMessages(messages))
  .then((count) => logger.info(`Successfully processed ${count} available messages.`))
  .catch((e) => logger.fatal({ err: e }, 'Unexpected error occurred'))
  .then(() => true);

if (process.env.LOCAL_DEBUG === 'true') {
  (async () => { await handle(); })();
} else {
  fdk.handle((input) => handle(input));
}

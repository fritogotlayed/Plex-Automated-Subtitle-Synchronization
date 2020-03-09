require('dotenv').config()
const { GraphQLServer } = require('graphql-yoga')
const { fileLoader, mergeTypes } = require('merge-graphql-schemas')
const path = require('path')
const mds = require('@maddonkeysoftware/mds-sdk-node');
const bunyan = require('bunyan');

const BunyanLogstashHttp = require('./bunyan-logstash-http');

const TvDbRepository = require('./domain/TvDbRepository')
const MovieRepository = require('./domain/MovieRepository')
const SubtitleRepository = require('./domain/SubtitleRepository')
const Query = require('./resolvers/Query')
const TvDbEpisode = require('./resolvers/TvDbEpisode')
const TvDbShow = require('./resolvers/TvDbShow')

const loggerMetadata = { fromLocal: process.env.DEBUG };
const logger = bunyan.createLogger({
  name: 'passApi',
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

const resolvers = {
    Query,
    TvDbShow,
    TvDbEpisode
}

let typesArr = fileLoader(path.join(__dirname, './schema'), { recursive: true })
let typeDefs = mergeTypes(typesArr, { all: true })

const server = new GraphQLServer( {
    typeDefs: typeDefs,
    resolvers,
    context: (request) => {
        return {
            ...request,
            TvDbRepository: new TvDbRepository(process.env.TV_DB_USERNAME, process.env.TV_DB_USER_KEY, logger),
            MovieRepository: new MovieRepository(process.env.OMDB_API_KEY, logger),
            SubtitleRepository: new SubtitleRepository(logger),
            logger,
        }
    }
})

mds.initialize({
    qsUrl: process.env.MDS_QS_URL,
    fsUrl: process.env.MDS_FS_URL
});

server.start(() => logger.info(`Server is running on http://localhost:4000`))
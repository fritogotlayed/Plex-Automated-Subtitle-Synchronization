require('dotenv').config()
const { GraphQLServer } = require('graphql-yoga')
const { fileLoader, mergeTypes } = require('merge-graphql-schemas')
const path = require('path')
const mds = require('@maddonkeysoftware/mds-sdk-node');

const TvDbRepository = require('./domain/TvDbRepository')
const Query = require('./resolvers/Query')
const TvDbEpisode = require('./resolvers/TvDbEpisode')
const TvDbShow = require('./resolvers/TvDbShow')

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
            TvDbRepository: new TvDbRepository(process.env.TV_DB_USERNAME, process.env.TV_DB_USER_KEY)
        }
    }
})

mds.initialize({
    qsUrl: process.env.MDS_QS_URL,
    fsUrl: process.env.MDS_FS_URL
});
server.start(() => console.log(`Server is running on http://localhost:4000`))
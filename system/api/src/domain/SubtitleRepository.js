const _ = require('lodash');
const mds = require('@maddonkeysoftware/mds-sdk-node');

const containerName = 'subtitles'

function SubtitleRepository() {
  this._fsClient = mds.getFileServiceClient();
  this._qsClient = mds.getQueueServiceClient();
}

SubtitleRepository.prototype.getMovieSubtitles = async function (args) {
  let language = (args.language || "en").toLowerCase().substring(0, 2);
  let basePath = `${containerName}/movie/${args.movieId}/${language}`;

  let subPath;
  try {
    let contents = await this._fsClient.listContainerContents(basePath);
    if (args.fileHash && contents.directories.indexOf(args.fileHash) > -1) {
      contents = await this._fsClient.listContainerContents(`${basePath}/${args.fileHash}`)
      subPath = `${args.fileHash}\${content.files[0]}`
    } else {
      subPath = contents.files[0];
    }

    return {
      movieId: args.movieId,
      downloadPath: `${process.env.MDS_FS_URL}/download/${basePath}/${subPath}`
    };
  } catch (e) {
    const metadata = {
      type: args.mediaType,
      language,
      fileHash: args.fileHash
    };
    _.merge(metadata, {
      movieId: args.movieId,
    })
    await this._qsClient.enqueueMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE, metadata);
    throw new Error('Could not locate suitable subtitle file.')
  }
}

SubtitleRepository.prototype.getShowSubtitles = async function (args) {
  let language = (args.language || "en").toLowerCase().substring(0, 2);
  let basePath = `${containerName}/show/${args.showId}/${args.episodeId}/${language}`;

  let subPath;
  try {
    let contents = await this._fsClient.listContainerContents(basePath);
    if (args.fileHash && contents.directories.indexOf(args.fileHash) > -1) {
      contents = await this._fsClient.listContainerContents(`${basePath}/${args.fileHash}`)
      subPath = `${args.fileHash}\${content.files[0]}`
    } else {
      subPath = contents.files[0];
    }

    return {
      showId: args.showId,
      episodeId: args.episodeId,
      downloadPath: `${process.env.MDS_FS_URL}/download/${basePath}/${subPath}`
    };
  } catch (e) {
    const metadata = {
      type: args.mediaType,
      language,
      fileHash: args.fileHash
    };
    _.merge(metadata, {
      showId: args.showId,
      episodeId: args.episodeId,
    })
    await this._qsClient.enqueueMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE, metadata);
    throw new Error('Could not locate suitable subtitle file.')
  }

}

module.exports = SubtitleRepository;

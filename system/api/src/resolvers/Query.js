const fetch = require('node-fetch')
const mds = require('@maddonkeysoftware/mds-sdk-node');

async function searchShow(parent, args, context, inf) {
  if (args.filter) {
    let filter = encodeURIComponent(args.filter)
    return context.TvDbRepository.searchShow(filter)
  }

  return []
}

async function listShowEpisodes(parent, args, context, inf) {
  if (args.id) {
    return context.TvDbRepository.getEpisodes(args.id)
  }

  return []
}

async function getSubtitles(parent, args, context, inf) {
  const fsClient = mds.getFileServiceClient();
  const qsClient = mds.getQueueServiceClient();
  let language = (args.language || "en").toLowerCase().substring(0, 2);
  let basePath = `subtitles/${args.showId}/${args.episodeId}/${language}`;
  let subPath;

  try {
    let contents = await fsClient.listContainerContents(basePath);
    if (args.fileHash && contents.directories.indexOf(args.fileHash) > -1) {
      contents = await fsClient.listContainerContents(`${basePath}/${args.fileHash}`)
      subPath = `${args.fileHash}\${content.files[0]}`
    } else {
      subPath = contents.files[0];
    }
  } catch (e) {
    await qsClient.enqueueMessage(process.env.PASS_SUBTITLES_NEEDED_QUEUE, {
      showId: args.showId,
      episodeId: args.episodeId,
      language,
      fileHash: args.fileHash
    });
    throw new Error('Could not locate suitable subtitle file.')
  }

  return {
    showId: args.showId,
    episodeId: args.episodeId,
    downloadPath: `${process.env.MDS_FS_URL}/download/${basePath}/${subPath}`
  };
}

module.exports = {
  searchShow,
  listShowEpisodes,
  getSubtitles
}
async function getShowDetails(parent, args, context, inf) {
  if (args.showId) {
    return context.TvDbRepository.getShow(args.showId);
  }

  return;
}

async function searchMovie(parent, args, context, inf) {
  if (args.filter) {
    let filter = encodeURIComponent(args.filter)
    return context.MovieRepository.searchMovie(filter)
  }

  return []
}

async function searchShow(parent, args, context, inf) {
  try {
    if (args.filter) {
      let filter = encodeURIComponent(args.filter)
      return context.TvDbRepository.searchShow(filter)
    }
  } catch (err) {
    context.logger.error({ err }, 'An error occurred while searching for shows')
  }

  return []
}

async function getEpisodeDetails(parent, args, context, inf) {
  if (args.episodeId) {
    return context.TvDbRepository.getEpisode(args.episodeId);
  }

  return;
}

async function getMovieDetails(parent, args, context, inf) {
  if (args.imdbId) {
    return context.MovieRepository.getMovie(args.imdbId);
  }

  return;
}

async function listShowEpisodes(parent, args, context, inf) {
  if (args.id) {
    return context.TvDbRepository.getEpisodes(args.id)
  }

  return []
}

async function getSubtitles(parent, args, context, inf) {
  const mediaTypeHandlers = {
    'movie': {
      requestHandler: context.SubtitleRepository.getMovieSubtitles.bind(context.SubtitleRepository),
      errorHandler: null
    },
    'show': {
      requestHandler: context.SubtitleRepository.getShowSubtitles.bind(context.SubtitleRepository),
      errorHandler: null
    }
  };

  let mediaType = args.mediaType.toLowerCase();

  const expectedMediaTypes = Object.keys(mediaTypeHandlers);
  if (expectedMediaTypes.indexOf(mediaType) == -1) {
    throw new Error(`mediaType is unexpected value. Found "${mediaType}" but expected one of the following: ${expectedMediaTypes.join(', ')}`)
  }

  try {
    return mediaTypeHandlers[mediaType].requestHandler(args);
  } catch (err) {
    context.logger.error({ err }, 'An error occurred while fetching subtitles.')
    throw new Error('Unable to fetch subtitles at this time. Please try again later.')
  }
}

module.exports = {
  searchShow,
  searchMovie,
  listShowEpisodes,
  getSubtitles,
  getShowDetails,
  getMovieDetails,
  getEpisodeDetails
}
const axios = require('./AxiosCached');

let authToken = '';
let authTokenExpiration;

function TvDbRepository(user, userKey, logger) {
  this._user = user
  this._userKey = userKey
  this._apiKey = process.env.TV_DB_API_KEY
  this._logger = logger;
}

TvDbRepository.prototype.checkCacheAndReturnData = function(response) {
  if (!response.request.excludedFromCache && response.request.fromCache && response.status >= 400) {
    this._logger.warn('HTTP code 400 or greater cached.')
  }

  return response.data;
};

TvDbRepository.prototype.getAuthToken = async function() {
  let now = new Date();
  if (authToken && authTokenExpiration > now) {
    return Promise.resolve(authToken);
  } else {
    let body = JSON.stringify({
      apikey: this._apiKey,
      userkey: this._userKey,
      username: this._user
    })

    return axios.post('https://api.thetvdb.com/login', body, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-us',
        'Content-Type': 'application/json'
      }
    })
    .then(res => this.checkCacheAndReturnData(res))
    .then(json => {
      // Per https://api.thetvdb.com/swagger the TVDB api token expires after 24 hours.
      let d = new Date();
      d.setTime(d.getTime() + (23 * 60 * 60 * 1000));
      authTokenExpiration = d;
      authToken = json.token;
      return authToken;
    });
  }
};

TvDbRepository.prototype.searchShow = async function (filter) {
  if (filter) {
    let token = await this.getAuthToken()
    return axios.get('https://api.thetvdb.com/search/series?name=' + filter,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-us',
        'Authorization': 'Bearer ' + token
      }
    })
    .then(res => this.checkCacheAndReturnData(res))
    .then(json => {
      return json.data.map( e => {
        return {
          aliases: e.aliases,
          banner: e.banner,
          firstAired: e.firstAired,
          id: e.id,
          name: e.seriesName,
          network: e.network,
          overview: e.overview,
          slug: e.slug,
          status: e.status
        }
      })
    })
  }

  return []
}

TvDbRepository.prototype.getShow = async function (showId) {
  if (showId) {
    let token = await this.getAuthToken()
    return axios.get('https://api.thetvdb.com/series/' + showId,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-us',
        'Authorization': 'Bearer ' + token
      }
    })
    .then(res => this.checkCacheAndReturnData(res))
    .then(json => {
      let e = json.data
      return {
        aliases: e.aliases,
        banner: e.banner,
        firstAired: e.firstAired,
        id: e.id,
        name: e.seriesName,
        network: e.network,
        overview: e.overview,
        slug: e.slug,
        status: e.status
      }
    })
  }

  return null
}

TvDbRepository.prototype.getEpisode = async function (episodeId) {
  if (episodeId) {
    let token = await this.getAuthToken()
    return axios.get('https://api.thetvdb.com/episodes/' + episodeId,
    {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-us',
        'Authorization': 'Bearer ' + token
      }
    })
    .then(res => this.checkCacheAndReturnData(res))
    .then(json => ({
      absoluteNumber: json.data.absoluteNumber,
      airedEpisodeNumber: json.data.airedEpisodeNumber,
      airedSeason: json.data.airedSeason,
      airsAfterSeason: json.data.airsAfterSeason,
      airsBeforeEpisode: json.data.airsBeforeEpisode,
      airsBeforeSeason: json.data.airsBeforeSeason,
      director: json.data.director,
      directors: json.data.directors,
      dvdChapter: json.data.dvdChapter,
      dvdDiscId: json.data.dvdDiscid,
      dvdEpisodeNumber: json.data.dvdEpisodeNumber,
      dvdSeason: json.data.dvdSeason,
      episodeName: json.data.episodeName,
      filename: json.data.filename,
      firstAired: json.data.firstAired,
      guestStars: json.data.guestStars,
      id: json.data.id,
      imdbId: json.data.imdbId,
      lastUpdated: json.data.lastUpdated,
      lastUpdatedBy: json.data.lastUpdatedBy,
      overview: json.data.overview,
      productionCode: json.data.productionCode,
      seriesId: json.data.seriesId,
      showUrl: json.data.showUrl,
      siteRating: json.data.siteRating,
      siteRatingCount: json.data.siteRatingCount,
      thumbAdded: json.data.thumbAdded,
      thumbAuthor: json.data.thumbAuthor,
      thumbHeight: json.data.thumbHeight,
      thumbWidth: json.data.thumbWidth,
      writers: json.data.writers
    }));
  }

  return
}

TvDbRepository.prototype.getEpisodes = async function (showId) {
  let page = 1
  let data = []

  while (page) {
    let d = await this._getEpisodesByPage(showId, page)
    data = data.concat(d.data)
    page = d.links.next
  }

  return data.map( e => {
    return {
      absoluteNumber: e.absoluteNumber,
      airedEpisodeNumber: e.airedEpisodeNumber,
      airedSeason: e.airedSeason,
      airsAfterSeason: e.airsAfterSeason,
      airsBeforeEpisode: e.airsBeforeEpisode,
      airsBeforeSeason: e.airsBeforeSeason,
      director: e.director,
      directors: e.directors,
      dvdChapter: e.dvdChapter,
      dvdDiscId: e.dvdDiscid,
      dvdEpisodeNumber: e.dvdEpisodeNumber,
      dvdSeason: e.dvdSeason,
      episodeName: e.episodeName,
      filename: e.filename,
      firstAired: e.firstAired,
      guestStars: e.guestStars,
      id: e.id,
      imdbId: e.imdbId,
      lastUpdated: e.lastUpdated,
      lastUpdatedBy: e.lastUpdatedBy,
      overview: e.overview,
      productionCode: e.productionCode,
      seriesId: e.seriesId,
      showUrl: e.showUrl,
      siteRating: e.siteRating,
      siteRatingCount: e.siteRatingCount,
      thumbAdded: e.thumbAdded,
      thumbAuthor: e.thumbAuthor,
      thumbHeight: e.thumbHeight,
      thumbWidth: e.thumbWidth,
      writers: e.writers
    }
  })
}

TvDbRepository.prototype._getEpisodesByPage = async function (showId, page) {
  let url = 'https://api.thetvdb.com/series/' + showId + '/episodes?page=' + page
  let token = await this.getAuthToken()
  return axios.get(url,
  {
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en-us',
      'Authorization': 'Bearer ' + token
    }
  })
  .then(res => this.checkCacheAndReturnData(res))
  .then(json => {
    if (json) {
      return json
    }
    return {
      links: { next: null }
    }
  })
}

module.exports = TvDbRepository

const fetch = require('node-fetch')
let authToken = ''
let authTokenExpiration

function TvDbRepository(user, userKey) {
    this._user = user
    this._userKey = userKey
    this._apiKey = process.env.TV_DB_API_KEY
}

TvDbRepository.prototype.getAuthToken = async function() {
    let now = new Date()
    if (authToken && authTokenExpiration > now) {
        return authToken
    } else {
        let body = JSON.stringify({
            apikey: this._apiKey,
            userkey: this._userKey,
            username: this._user
        })
        return fetch('https://api.thetvdb.com/login', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-us',
                'Content-Type': 'application/json'
            },
            body: body
        })
        .then(res => res.json())
        .then(json => {
            let d = new Date()
            d.setTime(d.getTime() + (23 * 60 * 60 * 1000))
            authTokenExpiration = d
            authToken = json.token
            return authToken
        })
    }
}

TvDbRepository.prototype.searchShow = async function (filter) {
    if (filter) {
        let token = await this.getAuthToken()
        return fetch('https://api.thetvdb.com/search/series?name=' + filter,
        {
            method: 'get',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-us',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => res.json())
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
        return fetch('https://api.thetvdb.com/series/' + showId,
        {
            method: 'get',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-us',
                'Authorization': 'Bearer ' + token
            }
        })
        .then(res => res.json())
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
    return fetch(url,
    {
        method: 'get',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en-us',
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
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

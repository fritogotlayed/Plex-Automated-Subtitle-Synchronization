const axios = require('./AxiosCached');

function MovieRepository(omdbApiKey, logger) {
  this._apiKey = omdbApiKey;
  this._logger = logger;
}

MovieRepository.prototype.getMovie = async function (imdbId) {
  if (imdbId) {
    return axios.get(`http://www.omdbapi.com/?i=${imdbId}&apiKey=${this._apiKey}&type=Movie`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-us',
        }
      })
      .then(res => res.data)
      .then(json => {
        // not mapping Ratings for now
        return {
          title: json.Title,
          year: json.Year,
          rated: json.Rated,
          released: json.Released,
          runtime: json.Runtime,
          genre: json.Genre,
          director: json.Director,
          writer: json.Writer,
          plot: json.Plot,
          language: json.Language,
          country: json.Country,
          awards: json.Awards,
          poster: json.Poster,
          metascore: json.Metascore,
          imdbRating: json.imdbRating,
          imdbVotes: json.imdbVotes,
          imdbID: json.imdbID,
          type: json.Type,
          dvd: json.DVD,
          boxOffice: json.BoxOffice,
          production: json.Production,
          website: json.Website
        }
      })
  }

  return null;
}

MovieRepository.prototype.searchMovie = async function (filter) {
  if (filter) {
    return axios.get(`http://www.omdbapi.com/?s=${filter}&apiKey=${this._apiKey}&type=Movie`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en-us',
        }
      })
      .then(res => res.data)
      .then(json => {
        // not mapping Ratings for now
        return json.Search.map( e => {
          return {
            title: e.Title,
            year: e.Year,
            imdbID: e.imdbID,
            type: e.Type,
            poster: e.Poster,
          }
        })
      })
  }

  return []
}

module.exports = MovieRepository

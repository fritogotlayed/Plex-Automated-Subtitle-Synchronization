/** @module A simple module to house common functionality and provide a module shim
 * for libraries that export a function directly that cannot be mocked by default.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * @param {string} url The full URL to download the file from
 * @param {string} destination The location to dowload the file to
 * @param {object} options
 * @param {string} options.filename Optional filename to use for destination file.
 */
const download = (url, destination, options) => {
  const parts = url.split('/');
  const fileName = options.filename || parts[parts.length - 1];
  const fullDestination = path.join(destination, fileName);
  const writer = fs.createWriteStream(fullDestination);

  return axios.get(url, { responseType: 'stream' })
    .then((resp) => {
      resp.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    });
};

module.exports = {
  download,
};

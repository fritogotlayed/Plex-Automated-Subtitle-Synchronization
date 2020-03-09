const _ = require('lodash');
const { setup, RedisStore } = require('axios-cache-adapter');
const redis = require('redis');

const client = redis.createClient({ url: 'redis://192.168.5.90:6379' });
const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;
const store = new RedisStore(client, 'httpCache');
const axios = setup({
  cache: {
    maxAge: TWENTY_FOUR_HOURS,
    store,
    exclude: {
      query: false
    },
  },
});

module.exports = axios;

const fs = require('fs');
const path = require('path');
const util = require('util');

const processFile = (rootPath, fileStat) => {
  const fileName = fileStat.path;
  return {
    name: fileName,
  };
};

const scanDirectory = (rootPath) => {
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  const parts = [
    rootPath,
  ];

  return readdir(path.join(...parts))
    .then((contents) => {
      const ignoreDirs = [
        '#recycle',
        '@eaDir',
        '.actors',
        'extrafanart',
      ];
      const ignoreExtensions = [
        '.nfo',
        '.jpg',
        '.srt',
        '.png',
        '.db',
        '.tbn'
      ];

      const filterDirs = (name) => ignoreDirs.indexOf(name) === -1;
      const filterFile = (name) => !ignoreExtensions.some((v) => name.path.indexOf(v) !== -1);

      const children = contents
        .filter(filterDirs)
        .map((e) => lstat(path.join(...parts, e)).then((r) => ({ path: e, stats: r })));

      return Promise.all(children)
        .then((items) => {
          const directories = items.filter((e) => e.stats.isDirectory()).map((e) => path.join(rootPath, e.path));
          const files = items.filter((e) => e.stats.isFile())
            .filter(filterFile)
            .map((stat) => processFile(rootPath, stat));

          return Promise.all(directories.map(d => scanDirectory(d)))
            .then((subDirectories) => Promise.all(files).then((f) => ({ subDirectories, files: f })))
            .then(({subDirectories, files}) => ({
              directory: rootPath,
              subDirectories,
              files: files,
            }));
        });
    })
    .catch((err) => {
      console.dir(err);
    });
};

module.exports.scanDirectory = scanDirectory;

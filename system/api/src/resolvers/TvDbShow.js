const episodes = (parent, args, context) => {
    return context.TvDbRepository.getEpisodes(parent.id)
}

module.exports = {
}
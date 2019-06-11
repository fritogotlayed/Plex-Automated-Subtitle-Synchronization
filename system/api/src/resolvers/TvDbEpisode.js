const show = (parent, args, context) => {
    return context.TvDbRepository.getShow(parent.seriesId)
}

module.exports = {
    show
}
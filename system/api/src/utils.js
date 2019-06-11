const jwt = require('jsonwebtoken')
const APP_SECRET = 'GraphQL-is-Aw3some'

function getUserId(context) {
    const Authorization = context.request.get('Authorization')
    if (Authorization) {
        const token = Authorization.replace('Bearer ', '')
        const { userId } = jwt.verify(token, APP_SECRET)
        return userId
    }

    throw new Error('Not authorized')
}

module.exports = {
    APP_SECRET,
    getUserId
}
'use strict'

module.exports = (app) => {
    let db = app.db
    let slapp = app.slapp
    let googleAuthorize = app.authentications.google.authorize
    let google_drive = require('../services/google_drive')(app)
    let async = require('async')

    function googleAuthFlow(msg, code) {
        // TODO if can authorize save it the tokens to the DB
        googleAuthorize(code, receivedGoogleCode.bind(null, msg), didNotReceiveGoogleCode.bind(null, msg))
    }

    function didNotReceiveGoogleCode(msg) {
        msg.say('Hey <@' + msg.meta.user_id + '> I couldn\'t authenticate your code, <' + app.authentications.google.authUrl + '|please try again here>')
    }

    function receivedGoogleCode(msg, authenticatedClient) {
        db.addGoogleCredentialsToUser(msg, authenticatedClient.credentials)
        msg.say('Hey <@' + msg.meta.user_id + '> I successfully integrated with your Google Drive! :wink:')
    }

    function getGoogleCode(text) {
        let matches = text.match('(4\/)')
        if (matches) {
            let code = text.slice(matches.index, matches.index + 45)
            if (code.indexOf(' ') && code.length == 45) {
                return code
            }
        }
        return false
    }

    let methods = {}
    methods.getGoogleCode = getGoogleCode
    methods.googleAuthFlow = googleAuthFlow

    return methods
}
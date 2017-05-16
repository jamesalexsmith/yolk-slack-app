'use strict'

module.exports = (app) => {
    let db = app.db
    let slapp = app.slapp
    let googleAuthorize = app.authentications.google.authorize
    let googleAuthUrl = app.authentications.google.authUrl

    function googleAuthFlow(msg, code) {
        // TODO if can authorize save it the tokens to the DB
        googleAuthorize(code, receivedGoogleCode.bind(null, msg), didNotReceiveGoogleCode.bind(null, msg))
    }

    function didNotReceiveGoogleCode(msg) {
        msg.say('Hey <@' + msg.meta.user_id + '> I couldn\'t authenticate your code, <' + app.authentications.google.authUrl + '|please try again here>')
    }

    function receivedGoogleCode(msg, authenticatedClient) {
        db.addGoogleAuthenticatedClientToUser(msg, authenticatedClient.credentials)
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
        console.log('WARNING: Text ', text, 'did not contain a google code...')
        return null
    }

    let methods = {}
    methods.getGoogleCode = getGoogleCode
    methods.googleAuthFlow = googleAuthFlow

    return methods
}
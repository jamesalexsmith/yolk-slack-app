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
        console.log('WARNING: Text ', text, 'did not contain a google code...')
        return null
    }

    slapp.command('/yolk', 'test', (msg) => {
        db.getUser(msg.meta.team_id, msg.meta.user_id).exec(function (err, users) {
            let user = users[0]

            if (user.google_credentials) {
                let credentials = JSON.parse(user.google_credentials)
                google_drive.searchFiles(credentials, 'founders agreement', readFiles.bind(null, msg, credentials))
            }

        })
        msg.respond('testing google!')
    })

    function readFiles(msg, credentials, files) {
        // Read all file asynchronously in parallel and wait for them to be done
        let asyncCalls = []
        for (var i = 0; i < files.length; i++) {
            let file = files[i]
            asyncCalls.push(function (callback) {
                google_drive.readFile(credentials, file, callback)
            })
        }

        async.parallel(asyncCalls, function (err, results) {
            console.log('HAVE RESULTS ASYNCED PARALLEL')
            console.log(files)
            console.log(results)
        })

        // Read all files

    }

    function log(fileTexts) {
        console.log('IN LOGGER')
    }

    let methods = {}
    methods.getGoogleCode = getGoogleCode
    methods.googleAuthFlow = googleAuthFlow

    return methods
}
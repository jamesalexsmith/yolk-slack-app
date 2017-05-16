'use strict'

module.exports = (app) => {
    // from https://console.developers.google.com/apis/credentials?project=encoded-yen-167622
    const clientId = "163115982433-c3du5mqaqq7ug5ofktnrs535v0lvpk1d.apps.googleusercontent.com"
    const clientSecret = "CntbqLcNSNle6xhvuhfIDhpf"
    const redirectUrl = "urn:ietf:wg:oauth:2.0:oob"

    var google = require('googleapis')
    var googleAuth = require('google-auth-library')
    var auth = new googleAuth()
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
    
    var scopes = ['https://www.googleapis.com/auth/drive.readonly']
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    })

    console.log('Google Authentication URL = \n', authUrl)

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(code, success_callback, failure_callback) {
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                failure_callback()
                console.log('Error while trying to retrieve access token', err)
                return
            }
            oauth2Client.credentials = token
            success_callback(oauth2Client)
        })
    }

    /**
     * Lists the names and IDs of up to 10 files.
     *
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    function listFiles(auth) {
        var service = google.drive('v3')
        service.files.list({
            auth: auth,
            pageSize: 10,
            fields: "nextPageToken, files(id, name)"
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err)
                return
            }
            var files = response.files
            if (files.length == 0) {
                console.log('No files found.')
            } else {
                console.log('Files:')
                for (var i = 0; i < files.length; i++) {
                    var file = files[i]
                    console.log('%s (%s)', file.name, file.id)
                }
            }
        })
    }

    let exports = {}
    exports.authUrl = authUrl
    exports.authorize = authorize

    return exports
}
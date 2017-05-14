'use strict'

module.exports = (app) => {
    const redirectUrl = "urn:ietf:wg:oauth:2.0:oob"
    // const redirectUrl = "https://48135427.ngrok.io/authCallback"
    // For online:
    // const GoogleRedirectionUrl = "https://beepboophq.com/proxy/f59577029d6b4f2cb5273e2d0aa6f657/googleAuthCallback"

    // yolk-local-test ramaneek client id
    const clientId = "163115982433-c3du5mqaqq7ug5ofktnrs535v0lvpk1d.apps.googleusercontent.com"
    const clientSecret = "CntbqLcNSNle6xhvuhfIDhpf"
    var google = require('googleapis')
    var googleAuth = require('google-auth-library')
    var auth = new googleAuth()
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
    var scopes = ['https://www.googleapis.com/auth/drive.readonly']
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });

    var readline = require('readline');
    console.log('auth url = \n', authUrl)

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(callback) {
        getNewToken(oauth2Client, callback);
    }

    /**
     * Get and store new token after prompting for user[authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     *
     * @param {getEventsCallback} callback The callback to call with the authorized
     *     client.
     */
    function getNewToken(callback) {
        console.log('Authorize this app by visiting this url: ', authUrl);
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter the code from that page here: ', function (code) {
            rl.close();
            oauth2Client.getToken(code, function (err, token) {
                if (err) {
                    console.log('Error while trying to retrieve access token', err);
                    return;
                }
                oauth2Client.credentials = token;
                storeToken(token);
                callback(oauth2Client);
            });
        });
    }

    /**
     * Store token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     */
    function storeToken(token) {
        return
    }

    /**
     * Lists the names and IDs of up to 10 files.
     *
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    function listFiles(auth) {
        var service = google.drive('v3');
        service.files.list({
            auth: auth,
            pageSize: 10,
            fields: "nextPageToken, files(id, name)"
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var files = response.files;
            if (files.length == 0) {
                console.log('No files found.');
            } else {
                console.log('Files:');
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    console.log('%s (%s)', file.name, file.id);
                }
            }
        });
    }


    getNewToken(listFiles);


















    // let server = app.server
    // let google = require('googleapis')
    // let googleOAuth2 = google.auth.OAuth2

    // // Alex's
    // // const GoogleClientId = "545541713475-epetbqv4n0bun96v6v8ar2i950hs54lm.apps.googleusercontent.com"
    // // const GoogleClientSecret = "me2_zlnkjYrALNGoPKTJ8PT9"

    // // For local:
    // const GoogleRedirectionUrl = "https://48135427.ngrok.io/googleAuthCallback"
    // // For online:
    // // const GoogleRedirectionUrl = "https://beepboophq.com/proxy/f59577029d6b4f2cb5273e2d0aa6f657/googleAuthCallback"

    // // yolk-local-test ramaneek client id
    // const GoogleClientId = "238727459583-p89h4cqrm2jdialb32dna5ae9594cbdn.apps.googleusercontent.com"
    // const GoogleClientSecret = "zsFrdPlQd-IHQ-zbk3Xa4jmS"

    // function getGoogleOAuthClient() {
    //     return new googleOAuth2(GoogleClientId, GoogleClientSecret, GoogleRedirectionUrl)
    // }

    // function getGoogleAuthUrl() {
    //     let oauth2Client = getGoogleOAuthClient()
    //     let scopes = ['https://www.googleapis.com/auth/drive.readonly']
    //     let url = oauth2Client.generateAuthUrl({
    //         access_type: 'offline',
    //         scope: scopes
    //     })
    //     return url
    // }

    // server.use("/googleAuthCallback", function (req, res) {
    //     let oauth2Client = getGoogleOAuthClient();
    //     let code = req.query.code; // the query param code

    //     oauth2Client.getToken(code, function (err, tokens) {
    //         if (err) {
    //             res.send(`Login failed!`)
    //             console.log('Error in google auth callback', err)
    //         } else {
    //             console.log(tokens)
    //             oauth2Client.setCredentials(tokens)
    //             res.send(`Login successful!`)
    //         }
    //     })
    // })


    // console.log('Google auth url:\n', getGoogleAuthUrl())
}
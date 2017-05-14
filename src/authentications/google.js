'use strict'

module.exports = (app) => {
    let server = app.server
    let google = require('googleapis')
    let googleOAuth2 = google.auth.OAuth2

    // Alex's
    // const GoogleClientId = "545541713475-epetbqv4n0bun96v6v8ar2i950hs54lm.apps.googleusercontent.com"
    // const GoogleClientSecret = "me2_zlnkjYrALNGoPKTJ8PT9"

    // For local:
    const GoogleRedirectionUrl = "https://48135427.ngrok.io/googleAuthCallback"
    // For online:
    // const GoogleRedirectionUrl = "https://beepboophq.com/proxy/f59577029d6b4f2cb5273e2d0aa6f657/googleAuthCallback"

    // yolk-local-test ramaneek client id
    const GoogleClientId = "238727459583-p89h4cqrm2jdialb32dna5ae9594cbdn.apps.googleusercontent.com"
    const GoogleClientSecret = "zsFrdPlQd-IHQ-zbk3Xa4jmS"

    function getGoogleOAuthClient() {
        return new googleOAuth2(GoogleClientId, GoogleClientSecret, GoogleRedirectionUrl)
    }

    function getGoogleAuthUrl() {
        let oauth2Client = getGoogleOAuthClient()
        let scopes = ['https://www.googleapis.com/auth/drive.readonly']
        let url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        })
        return url
    }

    server.use("/googleAuthCallback", function (req, res) {
        let oauth2Client = getGoogleOAuthClient();
        let code = req.query.code; // the query param code

        oauth2Client.getToken(code, function (err, tokens) {
            if (err) {
                res.send(`Login failed!`)
                console.log('Error in google auth callback', err)
            } else {
                console.log(tokens)
                oauth2Client.setCredentials(tokens)
                res.send(`Login successful!`)
            }
        })
    })


    console.log('Google auth url:\n', getGoogleAuthUrl())
}
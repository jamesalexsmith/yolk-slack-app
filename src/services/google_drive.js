'use strict'

module.exports = (app) => {
    let google = require('googleapis')
    let drive = google.drive('v3')

    function readFile(credentials, file, callback) {
        let client = app.authentications.google.getClient()
        client.credentials = credentials

        drive.files.export({
            fileId: file.id,
            mimeType: 'text/plain',
            auth: client
        }, function (err, text) {
            if (err) {
                console.log('The Drive export API returned an error: ' + err)
                return null
            }
            callback(null, {meta: file, text: text})
        })
    }

    function searchFiles(credentials, query, callback) {
        let client = app.authentications.google.getClient()
        client.credentials = credentials

        drive.files.list({
            q: "fullText contains '" + query + "' and mimeType = 'application/vnd.google-apps.document'",
            supportsTeamDrives: true,
            includeTeamDriveItems: true,
            auth: client,
            pageSize: 9,
            fields: "nextPageToken, files(id, name, modifiedTime)"
        }, function (err, response) {
            if (err) {
                console.log('The Drive list API returned an error: ' + err)
                return
            }

            let files = response.files
            callback(files)
        })
    }

    let exports = {}
    exports.readFile = readFile
    exports.searchFiles = searchFiles

    return exports
}
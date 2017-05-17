'use strict'

module.exports = (app) => {
    let google = require('googleapis')
    let drive = google.drive('v3')
    let async = require('async')
    let slapp = app.slapp
    let db = app.db
    let rp = require('request-promise')

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    slapp.command('/yolk', 'test', (msg) => {
        db.getUser(msg.meta.team_id, msg.meta.user_id).exec(function (err, users) {
            let user = users[0]

            if (user.google_credentials) {
                let credentials = JSON.parse(user.google_credentials)
                // searchFiles(credentials, 'founders agreement', readFiles.bind(null, msg, credentials))

                searchFiles(credentials, 'founders agreement', function (err, files) {
                    if (err) {
                        console.log('Error fetching files in drive', err)
                        return err
                    }

                    readFiles(credentials, files, function (err, fileContents) {
                        console.log(fileContents)
                    })
                })
            }

        })
        msg.respond('testing google!')
    })
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////


    function readFiles(credentials, question, files, callback) {
        // Read all file asynchronously in parallel and wait for them to be done
        let asyncCalls = []
        for (var i = 0; i < files.length; i++) {
            let file = files[i]
            asyncCalls.push(function (async_callback) {
                readFile(credentials, question, file, async_callback)
            })
        }

        async.parallel(asyncCalls, function (err, results) {
            callback(err, results)
        })
    }

    function readFile(credentials, question, file, callback) {
        let client = app.authentications.google.getClient()
        client.credentials = credentials

        drive.files.export({
            fileId: file.id,
            mimeType: 'text/plain',
            fields: 'id, webViewLink, name, modifiedTime',
            auth: client
        }, function (err, text) {
            if (err) {
                console.log('The Drive export API returned an error: ' + err)
                return null
            }

            let options = {
                method: 'POST',
                url: 'http://bidaf-yolk-alex-ai.cfapps.io/submit',
                headers: {
                    'cache-control': 'no-cache',
                    'content-type': 'application/json'
                },
                body: {
                    question: question,
                    paragraph: text,
                },
                json: true
            }

            rp(options)
                .then(function (body) {
                    let snippet = body.result.snippet
                    callback(null, {
                        meta: file,
                        text: text,
                        snippet: snippet
                    })
                })

                .catch(function (err) {
                    console.log('Error machine comprehension api call', err)
                    callback(null, {
                        meta: file,
                        text: text,
                        snippet: ''
                    })
                })


        })
    }

    let searchFiles = function (credentials, query, callback) {
        let client = app.authentications.google.getClient()
        client.credentials = credentials

        query = query.replace(/['"“”]+/g, '')

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
                return err
            }

            let files = response.files
            callback(err, files)
        })
    }

    let exports = {}
    exports.readFiles = readFiles
    exports.searchFiles = searchFiles

    return exports
}
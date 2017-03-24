'use strict'

module.exports = (app) => {
    let slapp = app.slapp
    var json2csv = require('json2csv')
    var fields = ['question',
                  'answer_1', 'meta_data_1', 'answer_2', 'meta_data_2', 'answer_3',
                  'meta_data_3', 'answer_4', 'meta_data_4', 'answer_5', 'meta_data_5']

    slapp.command('/yolk', '(export)', (msg, text) => {
        msg.respond('Working away... I\'ll direct message you the results when ready!')
        let historyOptions = {
            token: msg.meta.app_token,
            channel: msg.meta.channel_id,
            count: 1000
        }
        let json_csv = []
        
        getHistory(json_csv, msg, historyOptions)
    })

    function getHistory(json_csv, msg, requestOptions) {
        slapp.client.channels.history(requestOptions, (err, data) => {
            if (err) console.log('Error fetching channel history in export', err)

            for (var i = 0; i < data.messages.length; i++) {
                if (isQuestion(data.messages[i].text)) {
                    json_csv.push({
                        question: data.messages[i].text,
                        answer_1: data.messages[Math.max(i - 1, 0)].text,
                        answer_2: data.messages[Math.max(i - 2, 0)].text,
                        answer_3: data.messages[Math.max(i - 3, 0)].text,
                        answer_4: data.messages[Math.max(i - 4, 0)].text,
                        answer_5: data.messages[Math.max(i - 5, 0)].text,
                        meta_data_1: data.messages[Math.max(i - 1, 0)],
                        meta_data_2: data.messages[Math.max(i - 2, 0)],
                        meta_data_3: data.messages[Math.max(i - 3, 0)],
                        meta_data_4: data.messages[Math.max(i - 4, 0)],
                        meta_data_5: data.messages[Math.max(i - 5, 0)]
                    })
                }
            }

            if (data.has_more) {
                requestOptions.latest = data.messages[data.messages.length - 1].ts
                getHistory(json_csv, msg, requestOptions)
            }
            else {
                let csv = json2csv({data: json_csv, fields: fields})
                let fileOptions = {
                    token: msg.meta.bot_token,
                    filetype: 'csv',
                    title: 'question mining export',
                    filename: 'question mining export',
                    content: csv
                }
                slapp.client.files.upload(fileOptions, (err, data) => {
                    if (err) console.log('Error upload question export csv', err)
                    console.log(data)
                })
            }
        })
    }

    function isQuestion(text) {
        text = text.toLowerCase()
        return text.startsWith('who ') ||
            text.startsWith('what ') ||
            text.startsWith('when ') ||
            text.startsWith('where ') ||
            text.startsWith('why ') ||
            text.startsWith('how ') ||
            text.startsWith('is ') ||
            text.startsWith('can ') ||
            text.startsWith('does ') ||
            text.startsWith('do ') ||
            text.startsWith('which ') ||
            text.startsWith('am ') ||
            text.startsWith('are ') ||
            text.startsWith('was ') ||
            text.startsWith('were ') ||
            text.startsWith('may ') ||
            text.startsWith('could ') ||
            text.startsWith('should ') ||
            text.startsWith('has ') ||
            text.startsWith('did ') ||
            text.endsWith('?')
    }

    function getNextResponses(messages) {
        let texts = []
        for (var i = 0; i < messages.length; i++) {
            texts.push(messages[i].text)
        }
        return texts
    }

    return {}
}
'use strict'

module.exports = (app) => {
    let slapp = app.slapp
    var rp = require('request-promise')
    var notify_asker = require('./notify_asker')(app)

    function isInYolkThread(msg) {
        if (msg.body.event.thread_ts !== undefined) {
            if (msg.body.event.parent_user_id === msg.meta.bot_user_id) {
                if (msg.body.event.user !== msg.meta.bot_user_id) {
                    return true
                }
            }
        }

        return false
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

    function imUser(msg, text) {
        let imOptions = {
            token: msg.meta.bot_token,
            user: msg.meta.user_id
        }
        slapp.client.im.open(imOptions, (err, imData) => {
            if (err) {
                console.log('Error opening DM with user when sniffing')
                return
            }

            let reply = 'Noticed you asked a question:\n' + text + '\n Try to check with me before asking the channel!\n If I don\'t have the answer I can post it for you!\n <Interactive message for auto search and post question todo>'
            let msgOptions = {
                token: msg.meta.bot_token,
                channel: imData.channel.id,
                text: reply
            }

            slapp.client.chat.postMessage(msgOptions, (err, postData) => {
                if (err) {
                    console.log('Error sniffing with user', err)
                    return
                }
            })
        })
    }

    slapp.message('(.*)', (msg, text) => {
        if (isInYolkThread(msg)) {
            notify_asker(msg)
        } else if (isQuestion(msg.body.event.text)) {
            if (msg.meta.team_name.includes('Yolk') || msg.meta.team_name.includes('testing'))
            imUser(msg, text)
        }
    })
}
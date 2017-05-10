'use strict'

module.exports = (app) => {
    let slapp = app.slapp
    var rp = require('request-promise')
    var notify_asker = require('./notify_asker')(app)
    let sniffer = require('./sniffer')(app)

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
        return (text.startsWith('who ') ||
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
            text.endsWith('?')) &&
            text.split(' ').length - 1 >= 5
    }

    slapp.message('(.*)', (msg, text) => {
        if (isInYolkThread(msg)) {
            notify_asker(msg)
        } else if (isQuestion(msg.body.event.text)) {
            // TODO REMOVE FEATURE FLAG WHEN LAUNCHING OR LAUNCHED TEAM
            if (msg.meta.team_name.includes('Yolk') || msg.meta.team_name.includes('testing')) {
                sniffer.startSniffingFlow(msg, text)
            }
        }
    })
}
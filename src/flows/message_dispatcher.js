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

    slapp.message('(.*)', (msg, text) => {
        if (isInYolkThread(msg)) {
            notify_asker(msg)
        }
    })
}
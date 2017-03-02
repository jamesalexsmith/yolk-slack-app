'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  slapp.message('(.*)', (msg, text) => {
    if (msg.body.event.thread_ts !== undefined) {
      if (msg.body.event.parent_user_id === msg.meta.bot_user_id) {
        let token = msg.meta.bot_token
        let timestamp = msg.body.event.ts
        let channel = msg.body.event.channel

        let thumbs_up = {
          token: token,
          timestamp: timestamp,
          name: "+1",
          channel: channel
        }

        let thumbs_down = {
          token: token,
          timestamp: timestamp,
          name: "-1",
          channel: channel
        }

        slapp.client.reactions.add(thumbs_up, (err) => {
          if (err) console.log('Error adding reaction', err)
        })

        slapp.client.reactions.add(thumbs_down, (err) => {
          if (err) console.log('Error adding reaction', err)
        })
      }
    }
  })

  return {}
}
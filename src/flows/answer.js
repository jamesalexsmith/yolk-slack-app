'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  const request = require("request");

  // function slackAPI(token) {
  //   return new app.SlackWebClient(token);
  // }

  slapp.message('(.*)', (msg, text) => {
    if (msg.body.event.thread_ts !== undefined) {
      if (msg.body.event.parent_user_id === msg.meta.bot_user_id) {
        if (msg.body.event.user !== msg.meta.bot_user_id) {

            // Delete first bot helper message if present
            var options = {
              method: 'GET',
              url: 'https://slack.com/api/channels.replies',
              qs: { 
                token: msg.meta.app_token,
                channel: msg.body.event.channel,
                thread_ts: msg.body.event.thread_ts
              }
            }

            request(options, function (error, response, body) {
              if (error) throw new Error(error)
              let threaded_messages = JSON.parse(body).messages
              console.log(threaded_messages[1])

              if (msg.meta.bot_user_id === threaded_messages[1].user) {
                var delete_request = {
                  token: msg.meta.bot_token,
                  ts: threaded_messages[1].ts,
                  channel: msg.body.event.channel
                }
                slapp.client.chat.delete(delete_request, (err, data) => {
                  if (err) console.log('Error adding reaction', err)
                  else console.log(data)
                })
              }
            })


            // Add thumbs up and down to everything thats not our bot
            let thumbs_up = {
              token: msg.meta.bot_token,
              timestamp: msg.body.event.ts,
              name: "+1",
              channel: msg.body.event.channel
            }

            let thumbs_down = {
              token: msg.meta.bot_token,
              timestamp: msg.body.event.ts,
              name: "-1",
              channel: msg.body.event.channel
            }

            slapp.client.reactions.add(thumbs_up, (err) => {
              if (err) console.log('Error adding reaction', err)
            })

            slapp.client.reactions.add(thumbs_down, (err) => {
              if (err) console.log('Error adding reaction', err)
            })
        }
      }
    }
  })

  return {}
}
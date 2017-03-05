'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  var request = require("request");
  var rp = require('request-promise');

  function sortByLikes(messages) {

  }

  function getAllRepliesOptions(msg) {
    return {
      method: 'GET',
      url: 'https://slack.com/api/channels.replies',
      qs: {
        token: msg.meta.app_token,
        channel: msg.body.event.channel,
        thread_ts: msg.body.event.thread_ts
      },
      json: true
    }
  }

  function deleteFirstHelperMessage(msg, helperMessage) {
    let delete_request = {
      token: msg.meta.bot_token,
      ts: helperMessage.ts,
      channel: msg.body.event.channel
    }
    slapp.client.chat.delete(delete_request, (err, data) => {
      if (err) console.log('Error deleting helper message', err)
    })
  }

  function shouldNotifyAsker(threadedMessages) {
    // Is first answer of day for the thread?
    var latest_msg_date = new Date(threadedMessages[threadedMessages.length - 1].ts * 1000);
    latest_msg_date = new Date(latest_msg_date.getFullYear(), latest_msg_date.getMonth(), latest_msg_date.getDate());
    var prev_msg_date = new Date(threadedMessages[threadedMessages.length - 2].ts * 1000);
    prev_msg_date = new Date(prev_msg_date.getFullYear(), prev_msg_date.getMonth(), prev_msg_date.getDate());

    // When it is the first message of the day in the thread send IM
    return latest_msg_date > prev_msg_date
  }

  function messageAsker(msg, asker_username) {
    // Get users to find asker user id
    slapp.client.users.list({token: msg.meta.app_token}, (err, data) => {
      if (err) console.log('Error fetching users', err)
      let users = data.members
      for (let i = 0, len = users.length; i < len; i++) {
        if (users[i].name === asker_username) {
          var user_id = users[i].id
          break
        }
      }

      // Open IM with asker
      let imOptions = {
        token: msg.meta.bot_token,
        user: user_id
      }
      slapp.client.im.open(imOptions, (err, data) => {
        if (err) console.log('Error opening im with asker', err)
        let im_id = data.channel.id

        // Message asker
        let msgOptions = {
          token: msg.meta.bot_token,
          channel: im_id,
          text: 'test',
        }
        slapp.client.chat.postMessage(msgOptions, (err, data) => {
          if (err) console.log('Error messaging asker', err)
        })
      })
    })
  }

  function getAskerUsername(attachment) {
    return attachment.title.match('@(.+?(?=\\s))')[0].substr(1)
  }


  slapp.message('(.*)', (msg, text) => {

    // If message occurred in a threaded yolk question
    if (msg.body.event.thread_ts !== undefined) {
      if (msg.body.event.parent_user_id === msg.meta.bot_user_id) {
        if (msg.body.event.user !== msg.meta.bot_user_id) {

          rp(getAllRepliesOptions(msg))
            .then(function (body) {
              let threadedMessages = body.messages

              // Delete first bot helper message if present
              if (msg.meta.bot_user_id === threadedMessages[1].user) {
                deleteFirstHelperMessage(msg, threadedMessages[1])
              }

              // If first message of day
              if (shouldNotifyAsker(threadedMessages)) {
                // Notify asker of new activity
                let asker_username = getAskerUsername(threadedMessages[0].attachments[0])
                messageAsker(msg, asker_username)
              }
            })

            .catch(function (err) {
              console.log('Error getting threaded messages', err)
            })


          // Add thumbs up and down to everything that's not our bot
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
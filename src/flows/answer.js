'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  var request = require("request");
  var rp = require('request-promise');
  var lang_notify_comments = require('../language/answer/notify_comments.json')

  function getTodaysMessages(threadedMessages) {
    let todaysMessages = []
    let todaysDate = new Date()
    for (var i = 0; i < threadedMessages.length; i++) {
      let messageDate = new Date(threadedMessages[i].ts * 1000);
      if(todaysDate.setHours(0,0,0,0) == messageDate.setHours(0,0,0,0)) {
        todaysMessages.push(threadedMessages[i])
      }
    }

    return todaysMessages
  }

  function getUsernamesFromMessages(todaysMessages, usersList) {
    let todaysUsernames = []
    for (var i = 0; i < todaysMessages.length; i++) {
      for (var j = 0; j < users.length; j++) {
        if (todaysMessages[i].user === users[j].id) {
            todaysUsernames.push(users[j].name)
          }
      }
    }
    
    return todaysUsernames
  }

  function generateNotificationAttachment(threadedMessages, msg, usersList, asker_username) {
    let todaysMessages = getTodaysMessages(threadedMessages)
    let todaysUsernames = getUsernamesFromMessages(todaysMessages, usersList)
    
    console.log(msg)
    console.log(threadedMessages)

    let attachment = lang_notify_comments
    attachment.text = '_Hey ' + asker_username + ', there\'s been activity on your question!'
    // attachment.attachments[0].title = 

    // console.log(threadedMessages)

    slapp.action('answers_callback', 'show', 'show', (msg, text) => {

    })

    slapp.action('answers_callback', 'accept', 'accept', (msg, text) => {

    })

    slapp.action('answers_callback', 'dismiss', 'dismiss', (msg, text) => {

    })
    return 'testtstst'
  }


  function deleteFirstHelperMessage(msg, helperMessage) {
    let delete_request = {
      token: msg.meta.bot_token,
      ts: helperMessage.ts,
      channel: msg.body.event.channel
    }
    slapp.client.chat.delete(delete_request, (err, deleteData) => {
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

  function messageAsker(msg, asker_username, threadedMessages) {
    // Get users to find asker user id
    slapp.client.users.list({token: msg.meta.app_token}, (err, userData) => {
      if (err) console.log('Error fetching users', err)
      let users = userData.members
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
      slapp.client.im.open(imOptions, (err, imData) => {
        if (err) console.log('Error opening im with asker', err)

        // Message asker
        let msgOptions = {
          token: msg.meta.bot_token,
          channel: imData.channel.id,
          text: 'test'
          // text: generateNotificationAttachment(threadedMessages, msg, users, asker_username)
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

  function reactAsBot(reaction, msg) {
    // Add thumbs up and down to everything that's not our bot
    let reactionOptions = {
      token: msg.meta.bot_token,
      timestamp: msg.body.event.ts,
      name: reaction,
      channel: msg.body.event.channel
    }

    slapp.client.reactions.add(reactionOptions, (err) => {
      if (err) console.log('Error adding reaction', err)
    })
  }


  slapp.message('(.*)', (msg, text) => {

    // If message occurred in a threaded yolk question
    if (msg.body.event.thread_ts !== undefined) {
      if (msg.body.event.parent_user_id === msg.meta.bot_user_id) {
        if (msg.body.event.user !== msg.meta.bot_user_id) {

          let repliesOptions = {
            method: 'GET',
            url: 'https://slack.com/api/channels.replies',
            qs: {
              token: msg.meta.app_token,
              channel: msg.body.event.channel,
              thread_ts: msg.body.event.thread_ts
            },
            json: true
          }

          rp(repliesOptions)
            .then(function (body) {
              let threadedMessages = body.messages

              // Delete first bot helper message if present
              if (msg.meta.bot_user_id === threadedMessages[1].user) {
                deleteFirstHelperMessage(msg, threadedMessages[1])
              }

              let asker_username = getAskerUsername(threadedMessages[0].attachments[0])
              messageAsker(msg, asker_username, threadedMessages) // FOR TESTING

              // If first message of day
              if (shouldNotifyAsker(threadedMessages)) {
                // Notify asker of new activity
                // let asker_username = getAskerUsername(threadedMessages[0].attachments[0])
                // messageAsker(msg, asker_username, threadedMessages)
              }
            })

            .catch(function (err) {
              console.log('Error getting threaded messages', err)
            })


          // Add thumbs up and down to everything that's not our bot
          reactAsBot('+1', msg)
          reactAsBot('-1', msg)
        }
      }
    }
  })

  return {}
}
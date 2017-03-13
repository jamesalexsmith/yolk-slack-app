'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  var request = require("request");
  var rp = require('request-promise');
  var lang_notify_comments = require('../language/answer/notify_comments.json')
  var lang_select_answer = require('../language/answer/select_answer.json')
  var lang_accept_answer = require('../language/answer/accept_answer.json')
  var lang_navigate_answers = require('../language/answer/navigate_answers.json')
  var lang_next_button = require('../language/answer/next_button.json')
  var lang_previous_button = require('../language/answer/previous_button.json')


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

  function getUsernamesAndIdsFromMessages(todaysMessages, usersList) {
    // Return user ids and names of unique users
    let todaysUsernames = []
    for (var i = 0; i < todaysMessages.length; i++) {
      for (var j = 0; j < usersList.length; j++) {
        if (todaysMessages[i].user === usersList[j].id) {
          todaysUsernames.push(usersList[j].name)
        }
      }
    }

    todaysUsernames = [...new Set(todaysUsernames)]

    let todaysUsernamesAndIds = []
    for (var i = 0; i < todaysUsernames.length; i++) {
      for (var j = 0; j < usersList.length; j++) {
        if (todaysUsernames[i] === usersList[j].name) {
          todaysUsernamesAndIds.push([usersList[j].id, usersList[j].name])
        }
      }
    }
    
    return todaysUsernamesAndIds
  }

  function getStringOfMentions(todaysUsernamesAndIds) {
    let string = ''
    for (var i = 0; i < todaysUsernamesAndIds.length && i < 3; i++) {
      string += '@' + todaysUsernamesAndIds[i][1] + ', '
    }

    string = string.slice(0, -2)

    if (todaysUsernamesAndIds.length > 3) {
      string += ' and ' + todaysUsernamesAndIds.length - 3 + 'others!'
    } else {
      string += '!'
    }

    return string
  }

  function getMessageLink(msg, timestamp) {
    // https://yolkhq.slack.com/archives/testing/p1489077688000178
    let parsedTimestamp = timestamp.replace('.', '')
    return 'https://' + msg.meta.team_domain + '.slack.com/archives/' +  msg.meta.channel_name + '/p' + parsedTimestamp
  }

  function getUsername(message, usersList) {
    for (var i = 0; i < usersList.length; i++) {
      if (usersList[i].id === message.user) {
        return usersList[i].name
      }      
    }
  }

  function generateNotificationAttachment(threadedMessages, msg, usersList, asker_username) {
    let todaysMessages = getTodaysMessages(threadedMessages)
    let todaysUsernamesAndIds = getUsernamesAndIdsFromMessages(todaysMessages, usersList)

    let attachment = lang_notify_comments
    attachment.text = '_Hey ' + asker_username + ', there\'s been activity on your question!_'
    attachment.attachments[0].title = getQuestionText(threadedMessages[0].attachments[0])
    attachment.attachments[0].title_link = getMessageLink(msg, threadedMessages[0].ts)
    let numMessages = todaysMessages.length
    attachment.attachments[0].fields[0].title = numMessages + ' new comments by ' + getStringOfMentions(todaysUsernamesAndIds)
    attachment.attachments[0].footer = 'Last commented by ' + getUsername(todaysMessages[todaysMessages.length-1], usersList) 
    attachment.attachments[0].ts = todaysMessages[todaysMessages.length-1].ts

    return attachment
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

    // Get the channe lname for linking question
    let channelOptions = {
      token: msg.meta.app_token, 
      channel: msg.meta.channel_id
    }
    slapp.client.channels.info(channelOptions, (err, channelData) => {
      if (err) console.log('Error fetching channel info', err)
      msg.meta.channel_name = channelData.channel.name

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
          let reply = generateNotificationAttachment(threadedMessages, msg, users, asker_username)
          let msgOptions = {
            token: msg.meta.bot_token,
            channel: imData.channel.id,
            text: reply.text,
            attachments: reply.attachments
          }

          slapp.client.chat.postMessage(msgOptions, (err, postData) => {
            if (err) console.log('Error messaging asker', err)
          })
        })
      })
    })
  }

  function getAskerUsername(attachment) {
    return attachment.title.match('@(.+?(?=\\|))')[0].substr(1)
  }

  function getQuestionText(attachment) {
    return attachment.title.match('has a question: \\n(.*)')[1]
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
                let asker_username = getAskerUsername(threadedMessages[0].attachments[0])
                messageAsker(msg, asker_username, threadedMessages)
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


  function getTimestampOfQuestion(link) {
    let string = link.match('\\/p[0-9]*').slice(-1)[0].substr(2)
    string = string.slice(0, -6) + '.' + string.slice(-6, string.length)
    return string
  }

  function getChannelNameOfQuestion(link) {
    return link.match('archives\\/(.*)\\/p[0-9]*')[1]
  }

  function getChannelIdByName(channels, channelName) {
    for (var i = 0; i < channels.length; i++) {
      if (channelName == channels[i].name) {
        return channels[i].id
      }      
    }
  }

  function createPagination(threadedMessages) {
    let paginatedMessages = []

    for (var i = 0; i < threadedMessages.length; i+=3) {
      paginatedMessages.push(threadedMessages.slice(i, i+3))
    }
    return paginatedMessages
  }

  function getNumReactions(reactions, reaction_type) {
    if (reactions === undefined) return 0
    for (var i = 0; i < reactions.length; i++) {
      if (reactions[i].name === reaction_type) {
        return reactions[i].count
      }
    }
    return 0
  }

  function formatAcceptAnswer(paginatedMessage) {
    let formattedAcceptAnswer = lang_accept_answer
    formattedAcceptAnswer.title = '<@' + paginatedMessage.user + '>'
    formattedAcceptAnswer.text = paginatedMessage.text
    if (paginatedMessage.attachments) formattedAcceptAnswer.attachments = paginatedMessage.attachments
    formattedAcceptAnswer.fields = [
      {
        "title": ':+1: ' + getNumReactions(paginatedMessage.reactions, '+1') + '   :-1: ' + getNumReactions(paginatedMessage.reactions, '-1')
      }
    ]
    return formattedAcceptAnswer
  }

  function createFormattedPagination(pagination) {
    let answers = []
    pagination.forEach(function(paginatedMessage) {
      // Need to create a new instance
      answers.push(JSON.parse(JSON.stringify(formatAcceptAnswer(paginatedMessage))))
    }, this);
    return answers
  }

  function generateNavigationButtons(index, length) {
    let navigation = JSON.parse(JSON.stringify(lang_navigate_answers))
    if (index === 0) {
      navigation.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
    } else if (index == length - 1) {
      navigation.actions.push(JSON.parse(JSON.stringify(lang_previous_button)))
    } else {
      navigation.actions.push(JSON.parse(JSON.stringify(lang_previous_button)))
      navigation.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
    }

    return navigation
  }

  function generateFormattedPaginations(paginatedMessages) {
    let paginatedAnswers = []
    for (var i = 0; i < paginatedMessages.length; i++) {
      let formattedPagination = createFormattedPagination(paginatedMessages[i])
      formattedPagination.push(generateNavigationButtons(i, paginatedMessages.length))
      paginatedAnswers.push(formattedPagination)
      console.log(createFormattedPagination)
    }

    return paginatedAnswers
  }

  slapp.action('answers_callback', 'show', 'show', (msg, text) => {
    let channelName = getChannelNameOfQuestion(msg.body.original_message.attachments[0].title_link)
    
    slapp.client.channels.list({token: msg.meta.app_token}, (err, channelData) => {
      let channelId = getChannelIdByName(channelData.channels, channelName)
      let repliesOptions = {
        method: 'GET',
        url: 'https://slack.com/api/channels.replies',
        qs: {
          token: msg.meta.app_token,
          channel: channelId,
          thread_ts: getTimestampOfQuestion(msg.body.original_message.attachments[0].title_link)
        },
        json: true
      }

      rp(repliesOptions)
        .then(function (body) {
          let threadedMessages = body.messages
          let paginatedMessages = createPagination(threadedMessages.slice(1, threadedMessages.length))
          let formattedPaginatedMessages = generateFormattedPaginations(paginatedMessages)
          let reply = lang_select_answer

          reply.attachments = formattedPaginatedMessages[0]

          var state = {
            "pagination_index": 0,
            "paginations": formattedPaginatedMessages,
            "threaded_messages": threadedMessages,
            "channel_name": channelName,
            "channel_id": channelId
          }

          msg
            .respond(reply)
            .route('process_notification', state)

          
          // console.log('here')
          // msg.route('process_notification', state)
        })
    })
  })

  slapp.route('process_notification', (msg, state) => {
    let option = msg.body.actions[0].value
    let reply = lang_select_answer
    reply.attachments = state.paginations[state.pagination_index]
    
    if (option === 'accept') {
      console.log('TODOOO')
      msg.route('process_notification', state)
    }

    else if (option === 'next') {
      reply.attachments = state.paginations[state.pagination_index + 1]
      state.pagination_index += 1
    } 
    
    else if (option === 'previous') {
      reply.attachments = state.paginations[state.pagination_index - 1]
      state.pagination_index -= 1
    }

    msg
      .respond(reply)
      .route('process_notification', state)

  })

  function nextPage(msg, state) {

  }

  function acceptPage(msg, state) {

  }

  function acceptAnswer(msg, state) {

  }

  return {}
}
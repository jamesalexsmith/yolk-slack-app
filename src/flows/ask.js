'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let smb = app.smb

  let lang_ask_question = require('../language/ask_question.json')
  let lang_ask_question_with_details = require('../language/ask_question_with_details.json')
  let lang_cancelled_question = require('../language/cancelled_question.json')
  let lang_add_details_question = require('../language/add_details_question.json')
  let lang_question_with_details = require('../language/question_with_details.json')
  let lang_question_without_details = require('../language/question_without_details.json')

  function slackAPI(token) {
    return new app.SlackWebClient(token);
  }

  slapp.command('/yolk', 'test (.*)', (msg, text, question) => {
    var slack = slackAPI(msg.meta.bot_token)
    slack.channels.list(function(err, info) {
       if (err) {
           console.log('Error:', err);
       } else {
           for(var i in info.channels) {
               console.log(info.channels[i]);
           }
       }
    });
    msg.respond('hi this is a test')
  })


  slapp.command('/yolk', 'ask (.*) %%% (.*)', (msg, text, question, details) => {
    var state = {
      question: question,
      details: details
    }
    var response = lang_ask_question_with_details
    response.attachments[0].title = question
    response.attachments[0].callback_id = 'ask_callback'
    response.attachments[0].fields[0].value = '```' + details + '```'

    msg
      .respond(response)
      .route('ask_confirmation', state)
    
  })

  slapp.command('/yolk', 'ask (.*)', (msg, text, question) => {
    var state = {
      question: question,
      details: null
    }
    var response = lang_ask_question
    response.attachments[0].title = question
    response.attachments[0].callback_id = 'ask_callback'

    msg
      .respond(response)
      .route('ask_confirmation', state)
  })


  slapp.route('ask_confirmation', (msg, state) => {
    if (msg.type !== 'action') {
      msg
        .respond('Please choose a Yes or No button :wink:')
        .route('ask_confirmation', state)
      return
    }

    let answer = msg.body.actions[0].value

    if (answer === 'cancel') {
      var response = lang_cancelled_question
      response.attachments[0].title = state.question
      if (state.details !== null) {
        response.attachments[0].fields[0].value = '```' + state.details + '```'
      }
      
      msg.respond(response)
      return
    } 

    else if (answer === 'details') {
      var response = lang_add_details_question
      response.attachments[0].title = 'Add details by typing this in the channel you wish to ask the question in'
      response.attachments[0].fields[0].value = '```/yolk ask ' + state.question + ' %%% [YOUR_DETAILS_HERE]```'
      msg.respond(response)
    } 

    else if (answer === 'post') {
      var team_name = msg.meta.team_name
      var user_name = msg.body.user.name
      var channel_name = msg.body.channel.name

      if (state.details !== null) {
        var response = lang_question_with_details
        response.attachments[0].fields[0].value = '```' + state.details + '```'
      } else {
        var response = lang_question_without_details
      }

      response.text = '_Hey ' + team_name + ', @' + user_name + ' has a question for everyone in @channel_\n'
      response.attachments[0].title = state.question
      response.attachments[0].callback_id = 'ask_callback'

      msg
        .respond('_:tada: posting your question to ' + channel_name + '_')
        .say(response)
    }

    // msg.respond(msg.body.response_url, '')
  })


  slapp.route('add_details', (msg) => {
    // respond with a random entry from array
    msg.say(['Me too', 'Noted', 'That is interesting'])
  })

  // slapp.route('ask_confirmation', (msg) => {
  //   msg.say('in ask_confirmation')
  //   console.log(msg)
  //   msg.say({
  //       text: 'Are you sure you want to post this to this channel?',
  //       attachments: [
  //         {
  //           text: '',
  //           fallback: 'Yes or No?',
  //           callback_id: 'yesno_callback',
  //           actions: [
  //             { name: 'answer', text: 'Yes', type: 'button', value: 'yes' },
  //             { name: 'answer', text: 'No',  type: 'button',  value: 'no' }
  //           ]
  //         }]
  //       })
  // })

  slapp.action('yesno_callback', 'answer', (msg, value) => {
    msg.respond(msg.body.response_url, `${value} is a good choice!`)
  })

  return {}
}

/*

User asks question in DM
Only searches, says to post this question direct mention me in the channel

User direct mentions, take text
search for questions with text
button to ask see more questions
button to say post this question

confirmation to post to the channel

start answer threading

*/







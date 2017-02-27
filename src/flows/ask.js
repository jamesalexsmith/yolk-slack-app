'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let smb = app.smb

  let lang_ask_question = require('../language/ask_question.json')
  let lang_cancelled_question = require('../language/cancelled_question.json')

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


  slapp.command('/yolk', 'ask (.*)', (msg, text, question) => {
    var state = {
      asked_question: question
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
      response.attachments[0].title = state.asked_question
      msg.respond(response)
    }

    console.log(msg)
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







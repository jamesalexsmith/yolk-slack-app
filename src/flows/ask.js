'use strict'

module.exports = (app) => {
  let slapp = app.slapp
  let smb = app.smb

  slapp.command('/yolk', /^\s*ask\s*$/, (msg, text) => {
    msg.route('ask_confirmation')
  })

  slapp.message('(.*)', 'direct_mention', (msg, text) => {
    msg
      .say('direct mentioned me')
      .route('ask_confirmation')
  })

  slapp.message('(.*)', 'direct_message', (msg, text) => {
    if (text === 'help'){
      return {}
    }

    msg.say('TODO: search for similar questions')
    msg.say('If you want to post this question direct mention me or use a /yolk command in the channel you want to post a question to!')
  })

  slapp.route('ask_confirmation', (msg) => {
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
*/
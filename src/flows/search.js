'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  slapp.message('(.*)', 'direct_message', (msg, text) => {
    if (text === 'help'){
      return {}
    }

    msg.say('TODO: search for similar questions')
    msg.say('If you want to post this question direct mention me or use a /yolk command in the channel you want to post a question to!')
  })

  return {}
}
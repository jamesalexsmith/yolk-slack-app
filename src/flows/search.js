'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  slapp.message('(.*)', ['direct_message', 'direct_mention'], (msg, text) => {
    if (text === 'help'){
      return {}
    } else if (text.startsWith('Noticed you were asking a question!')) {
      return {}
    }

    msg.say('TODO: search for similar questions')
    msg.say('If you want to post this question direct mention me or use a /yolk command in the channel you want to post a question to!')
  })

  return {}
}
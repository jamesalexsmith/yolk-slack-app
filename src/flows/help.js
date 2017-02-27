'use strict'

module.exports = (app) => {
  let slapp = app.slapp

  let help = `Yolk is pretty simple. Ask question with the \`/yolk\` command or direct mention or message me!:
\`\`\`
/yolk [type your question here]
\`\`\`

I also listen in on conversations in channels and try to learn which questions have been answered!

Other possible commands:
help
stats
todo
`

  slapp.command('/yolk', /^\s*help\s*$/, (msg) => {
    msg.respond(help)
  })

  slapp.message('(help)', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })

  slapp.event('bb.team_added', function (msg) {
    slapp.client.im.open({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
      if (err) {
        return console.error(err)
      }
      let channel = data.channel.id

      msg.say({ channel: channel, text: 'Thanks for adding me to your team!' })
      msg.say({ channel: channel, text: help })
    })
  })

  return {}
}

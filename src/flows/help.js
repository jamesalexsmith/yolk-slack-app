'use strict'

module.exports = (app) => {
  let db = app.db
  let slapp = app.slapp

  let help = "Hey, I'm @Yolk! Let me show you how I work :) \n\nI'm here to answer your questions. *All of the questions!!*\n\nSo bother me instead of your coworkers.:vertical_traffic_light::smile:\n\nJust type `/yolk` in any channel and ask your question.\n\nLike this!\n\n ```/yolk where's the product FAQ sheet?```\n\nOr:\n\n```/yolk where is the objection handling doc?```\n\nOr this:\n\n```/yolk how do we troubleshoot a server issue```\n\nOr even this!\n\n```/yolk where is the industry case study?```\n\n\n Also, like the Egg Head:egg: I am, I'm constantly learning about (COMPANY).\n\n*I continue to build (Company)'s knowledge base finding important information from everyday Slack conversations.*\n\nAnd if I really can't find the answer you're looking for, I ask the right people for you!\n\n*Need addiitonal help?*\nGet in touch with a human of our team by typing `operator`, right through Slack!:fire_engine:"


  slapp.message('help', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })

  slapp.command('/yolk', 'help', (msg, text, question, details) => {
    msg.respond(help)
  })

  slapp.message('operator', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say("Calling help!")
  })

  slapp.command('/yolk', '(operator)', (msg, text, question, details) => {
    msg.respond("Calling help!")
  })

  slapp.command('/yolk', 'support', (msg, text, question, details) => {
    let supportText = 'Please provide details with your support request so we can resolve issues quickly!'
    msg.respond('<mailto:support@getyolk.com|Click to email us!>\n' + supportText)
  })

  // slapp.event('bb.team_added', function (msg) {
  //   slapp.client.im.open({
  //     token: msg.meta.bot_token,
  //     user: msg.meta.user_id
  //   }, (err, data) => {
  //     if (err) {
  //       return console.error(err)
  //     }
  //     let channel = data.channel.id

  //     msg.say({
  //       channel: channel,
  //       text: 'Thanks for adding me to your team!'
  //     })
  //     msg.say({
  //       channel: channel,
  //       text: help
  //     })
  //   })
  // })

  return {}
}
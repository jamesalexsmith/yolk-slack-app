'use strict'

module.exports = (app) => {
	let slapp = app.slapp
	var lang_accepted_notification = require('../language/answer/accepted_notification.json')

	slapp.action('answers_callback', 'accept', (msg, text) => {
		let acceptedMessage = JSON.parse(msg.body.actions[0].value)
		let reply = lang_accepted_notification
		reply.text = "_ <@" + msg.meta.user_id + '> has accepted a response from <@' + acceptedMessage.event.user + '>!_'
		reply.attachments[0].title = acceptedMessage.event.text
		reply.attachments[0].fields[0].value = '<@' + acceptedMessage.event.user + '>'
		reply.attachments[0].ts = Math.floor(new Date() / 1000)

		let msgOptions = {
			token: msg.meta.bot_token,
			channel: acceptedMessage.event.channel,
			text: reply.text,
			attachments: reply.attachments,
			thread_ts: acceptedMessage.event.thread_ts,
			reply_broadcast: true,
			as_user: true
		}

		slapp.client.chat.postMessage(msgOptions, (err, postData) => {
			if (err) {
				console.log('Error posting accepted answer', err)
				return
			}
		})
	})

	return {}
}
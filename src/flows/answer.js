'use strict'

module.exports = (app) => {
	let slapp = app.slapp
	let lang_accepted_notification = require('../language/answer/accepted_notification.json')
	let lang_accepted_question_answer = require('../language/notify_asker/accepted_question_answer.json')

	slapp.action('answers_callback', 'accept', (msg, text) => {
		// Post accepted response in Question thread
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
			as_user: true
		}

		slapp.client.chat.postMessage(msgOptions, (err, postData) => {
			if (err) {
				console.log('Error posting accepted answer', err)
				return
			}
			// Update the IM thread to show an accepted QA
			updateImThread(msg, acceptedMessage)
			// Update the channel thread to show an accepted QA
			// TODO:
			updateChannelThread(msg, acceptedMessage)
		})
	})
	
	function updateImThread(msg, acceptedMessage) {
		// console.log(msg)
		// console.log('\n\naccepted message:\n')
		// console.log(acceptedMessage)
	}

	function updateChannelThread(msg, acceptedMessage) {
		let historyOptions = {
            token: msg.meta.app_token,
            channel: acceptedMessage.event.channel,
            latest: acceptedMessage.event.thread_ts,
			inclusive: true,
			count: 1
        }
		slapp.client.channels.history(historyOptions, (err, historyData) => {
			if (err) {
				console.log('Error fetching parent message when accepted for channel', err)
				return
			}

			let question = historyData.messages[0].attachments[0].title.match('\\\n (.*)')[1]
			let answer = acceptedMessage.event.text

			let reply = lang_accepted_question_answer
			reply.attachments[0].title = 'Q: ' + question + '\nA: ' + answer
			reply.attachments[0].footer = 'Answered by <@' + acceptedMessage.event.user + '> on <!date^' + Math.floor(new Date() / 1000) + '^{date_long} at {time}|' + new Date().toLocaleString() + '>'

			let updateOptions = {
				token: msg.meta.bot_token,
				channel: acceptedMessage.event.channel,
				text: reply.text,
				attachments: reply.attachments,
				ts: acceptedMessage.event.thread_ts
			}
			slapp.client.chat.update(updateOptions, (err, postData) => {
				if (err) {
					console.log('Error notifying asker of new question', err)
					return
				}
			})
		})
	}

	return {}
}
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
			// TODO: send database Q&A pair
			// Update the IM thread to show an accepted QA
			updateImThread(msg, acceptedMessage)
			// Update the channel thread to show an accepted QA
			updateChannelThread(msg, acceptedMessage)
		})
	})
	
	function updateImThread(msg, acceptedMessage) {
		let channel_id = msg.body.channel.id
		let thread_ts = msg.body.original_message.thread_ts
		let user_id = acceptedMessage.event.user
		let answer = acceptedMessage.event.text
		replaceQATitle(msg.meta.app_token, msg.meta.bot_token, channel_id, thread_ts, user_id, answer)
	}

	function updateChannelThread(msg, acceptedMessage) {
		let channel_id = acceptedMessage.event.channel
		let thread_ts = acceptedMessage.event.thread_ts
		let user_id = acceptedMessage.event.user
		let answer = acceptedMessage.event.text
		console.log(answer)
		replaceQATitle(msg.meta.app_token, msg.meta.bot_token, channel_id, thread_ts, user_id, answer)
	}

	function replaceQATitle(app_token, bot_token, channel_id, thread_ts, user_id, answer) {
		let historyOptions = {
            token: app_token,
            channel: channel_id,
            latest: thread_ts,
			inclusive: true,
			count: 1
        }
		slapp.client.channels.history(historyOptions, (err, historyData) => {
			if (err) {
				console.log('Error fetching parent message when accepted for channel', err)
				return
			}

			// If an answer was already accepted before
			if (historyData.messages[0].text == '_The question is resolved!_') {
				// Fetch previous answer, if the same don't update
				let prevAnswer = historyData.messages[0].attachments[0].title.match('Q:\\s(.*)\\\nA:\\s(.*)')[2]
				var question = historyData.messages[0].attachments[0].title.match('Q:\\s(.*)\\\nA:\\s(.*)')[1]
				if (prevAnswer == answer) {
					return
				}
			} else {
				// Fetch question from the original Yolk post question text
				var question = historyData.messages[0].attachments[0].title.match('\\\n (.*)')[1]
			}

			let reply = lang_accepted_question_answer
			reply.attachments[0].title = 'Q: ' + question + '\nA: ' + answer
			reply.attachments[0].footer = 'Answered by <@' + user_id + '> on <!date^' + Math.floor(new Date() / 1000) + '^{date_long} at {time}|' + new Date().toLocaleString() + '>'

			let updateOptions = {
				token: bot_token,
				channel: channel_id,
				text: reply.text,
				attachments: reply.attachments,
				ts: thread_ts
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
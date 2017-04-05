'use strict'

module.exports = (app) => {
	let slapp = app.slapp

	slapp.command('/yolk', '(search)', (msg, text) => {
		console.log('search', msg)
		msg.respond('Searching.')
	})

	slapp.message('(.*)', ['direct_message', 'direct_mention'], (msg, text) => {
		if (text === 'help') {
			return {}
		} else if (text.startsWith('Noticed you asked me to post a ')) {
			return {}
		} else if (msg.body.event.thread_ts) { // In a thread
			return {}
		}

		let searchQuery = 'from:@yolk Hey @channel has a question: ' + text

		let searchOptions = {
			token: msg.meta.app_token,
			query: searchQuery,
			count: 100
		}

		slapp.client.search.messages(searchOptions, (err, searchData) => {
			if (err) {
				console.log('Error searching for yolk', err)
				return
			}

			// Filter out messages that aren't threaded (hack to find yolk things)
			let messages = []
			for (var i = 0; i < searchData.messages.matches.length; i++) {
				if (searchData.messages.matches[i].permalink.includes('thread_ts')) {
					messages.push(searchData.messages.matches[i])
				}
			}

			if (messages.length === 0) {
				msg.say('No results found!')
				return
			}

			let reply = 'Found ' + messages.length + ' matches!'
			for (var i = 0; i < messages.length; i++) {
				reply += ' \n'
				reply += messages[i].permalink
			}
			msg.say(reply)
		})
	})



	return {}
}
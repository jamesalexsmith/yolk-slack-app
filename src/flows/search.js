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
			count: 5
		}

		slapp.client.search.messages(searchOptions, (err, searchData) => {
			if (err) {
				console.log('Error searching for yolk', err)
				return
			}

			if (searchData.messages.matches.length === 0) {
				msg.say('No results found!')
				return
			}

			let reply = 'Found ' + searchData.messages.matches.length + ' matches!'
			for (var i = 0; i < searchData.messages.matches.length; i++) {
				reply += ' \n'
				reply += searchData.messages.matches[i].permalink
			}
			msg.say(reply)
		})
	})



	return {}
}
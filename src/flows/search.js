'use strict'

module.exports = (app) => {
	let slapp = app.slapp

	slapp.command('/yolk', '(search)', (msg, text) => {
		console.log('search', msg)
		msg.respond('Searching.')
	})

	slapp.message('(.*)', ['direct_message', 'direct_mention'], (msg, text) => {
		let searchQuery = 'from:@yolk Hey @channel has a question:' + msg.body.event.text

		let searchOptions = {
			token: msg.meta.bot_token,
			query: 'test',
			count: 5
		}

		slapp.client.search.messages(searchOptions, (err, searchData) => {
			if (err) {
				console.log('Error searching for yolk', err)
				return
			}

			console.log(searchData)
		})
	})

	return {}
}
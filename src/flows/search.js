'use strict'

module.exports = (app) => {
	let slapp = app.slapp

	slapp.command('/yolk', '(search)', (msg, text) => {
		console.log('search', msg)
		msg.respond('Searching.')
	})

	slapp.message('(.*)', ['direct_message'], (msg, text) => {
		if (text === 'help') {
			return {}
		} else if (text.startsWith('Noticed you asked me to post a ')) {
			return {}
		} else if (msg.body.event.thread_ts) { // In a thread
			return {}
		}

		// Found matches?
			// hyper link q&a threads
			// accept answer?
				// send thanks
				// upload data to DB validating q&a
				// return
			// next page? // TODO confidence score
				// loop back
			// Post question?
				// post the question
			// return
	})

	function confirmPostYolkQuestion(msg) {
		
	}

	function postQuestion(msg) {
		
	}

	function paginateMatches(qaMatches, paginationLength) {
		// return pagination
	}


	function nextPageExists(paginatedQAMatches, pageIndex) {

	}

	function prevPageExists(paginatedQAMatches, pageIndex) {

	}

	function sendValidationData(msg, qaMatch) {
		// send thanks
	}

	function sendThanks(msg, qaMatch) {
		
	}

	return {}
}
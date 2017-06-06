'use strict'

module.exports = (app) => {
	let db = app.db
	let slapp = app.slapp
	let authenticate = require('./authenticate')(app)
	let google_drive = require('../services/google_drive')(app)

	const SCORE_THRESHOLD = 1.0

	// Languages
	let lang_post_question_confirmation = require('../language/post_question/ask_question_confirmation.json')
	let lang_next_button = require('../language/search/next_button.json')
	let lang_prev_button = require('../language/search/prev_button.json')
	let lang_dismiss_button = require('../language/search/dismiss_button.json')
	let lang_question_button = require('../language/search/question_button.json')
	let lang_qa_pair = require('../language/search/qa_pair.json')
	let lang_google_drive_qa_pair = require('../language/search/google_drive_qa_pair.json')
	let lang_pagination = require('../language/search/pagination.json')
	let lang_results = require('../language/search/results.json')

	slapp.command('/yolk', '(search)', (msg, text) => {
		console.log('search', msg)
		msg.respond('Searching.')
	})

	slapp.message('(.*)', ['direct_message'], (msg, text) => {
		if (text === 'help') {
			return {}
		} else if (text.startsWith('yolk import')) {
			return {}
		} else if (text.startsWith('Noticed you asked me to post a ')) {
			return {}
		} else if (authenticate.getGoogleCode(text)) {
			// Google auth token
			authenticate.googleAuthFlow(msg, authenticate.getGoogleCode(text))
			return {}
		} else if (msg.body.event.thread_ts) { // In a thread
			return {}
		}

		startSearchFlow(msg, text)
	})

	function startSearchFlow(msg, question, ephemeral = false, sniffer_asker_user_id = null, response_url = null) {
		let is_sniffing = ephemeral // If we want the search results to be ephemeral we're sniffing

		db.getUser(msg.meta.team_id, msg.meta.user_id).exec(function (err, users) {
			if (err || users.length == 0) {
				console.log('Error fetching users', users)
				return err
			}

			let user = users[0]

			if (user.google_credentials) {
				let credentials = JSON.parse(user.google_credentials)

				google_drive.searchFiles(credentials, question, function (err, googleSearchResults) {
					if (err) {
						console.log('Error fetching google files in drive when searching', err)
						return err
					}

					google_drive.readFiles(credentials, question, googleSearchResults, function (err, googleFiles) {
						db.getQAPairs(msg.meta.team_id, question).limit(9).exec(function (err, docs) {
							if (err) {
								console.log('Error fetching validated qa pairs in search flow', err)
								return
							}

							// Remove docs which have less score than threshold
							
							console.log(docs)

							// Label the type of item so when building the message the style is reserved
							docs = labelType(docs, 'yolk')
							googleFiles = labelType(googleFiles, 'google')

							let searchResults = docs.concat(googleFiles)

							if (err) {
								console.log('Error searching question models', err)
								return err
							}

							if (docs.length == 0 && googleFiles.length == 0) { // No validated results in Yolk 
								startQuestionPostingFlow('_I couldn\'t find an answer to your question. Would you like to post it in Slack?_', msg, question)
							} else { // Found already matched Q&A pairs
								let paginations = paginateMatches(searchResults)
								let reply = formatResults(msg, paginations, 0)

								if (docs.length == 0) { // No validated results but we found results in google
									reply.text = '_I couldn\'t find an answer to your question that your peers have vetted but I think it may exist in Google Drive._'
								}

								let state = {
									'question': question,
									'reply': reply,
									'paginations': paginations,
									'index': 0,
									'ephemeral': ephemeral,
									'sniffer_asker_user_id': sniffer_asker_user_id,
									'sniffer_response_url': response_url
								}

								if (ephemeral) {
									// Need to respond with a new message
									reply.replace_original = false
									msg.respond(response_url, reply)
								} else {
									msg.say(reply)
								}

								msg.route('search_flow', state)
							}
						})
					})
				})
			}
		})
	}

	slapp.route('search_flow', (msg, state) => {
		if (msg.type === 'action') {
			let answer = msg.body.actions[0].name

			if (answer === 'next') {
				state.index += 1
				let reply = formatResults(msg, state.paginations, state.index)
				msg
					.respond(reply)
					.route('search_flow', state)
			} else if (answer === 'previous') {
				state.index -= 1
				let reply = formatResults(msg, state.paginations, state.index)
				msg
					.respond(reply)
					.route('search_flow', state)
			} else if (answer === 'validate') {
				msg.respond('I\'m glad to have helped, I\'ll send along the thanks! :smile:')
				let meta_data = JSON.parse(msg.body.actions[0].value)
				let qa_pair_index = meta_data.qa_pair_index
				let asker_user_id = meta_data.asker_user_id
				let answerer_user_id = meta_data.answerer_user_id

				// If the search flow started ephemerally from a sniff original_message isn't passed by slack

				let qa_pair = false
				if (!state.ephemeral) {
					qa_pair = msg.body.original_message.attachments[qa_pair_index]
					// Show selected answer
					qa_pair.actions = []
					msg.say({text: '_This is the answer!_', 'attachments': [qa_pair]})
				}
				// In a sniffing flow the answer was found so update the original yolk message to say it was found
				else if (state.ephemeral) {
					let response = 'Hey <@' + state.sniffer_asker_user_id + '>, <@' + msg.meta.user_id + '> thinks this may be the answer!\n>>>\n'
					if (state.sniffer_asker_user_id == msg.meta.user_id) {
						// The question poster sniffed and found an answer on their own
						response = '<@' + state.sniffer_asker_user_id + '> found the answer!\n>>>\n'
					}
					response += meta_data.answer
					msg.respond(state.sniffer_response_url, response)
				}

				sendThanks(msg, qa_pair, asker_user_id, answerer_user_id)
				return
			} else if (answer === 'question') {
				let response_url = msg.body.response_url

				msg.respond(response_url, {
					text: '',
					delete_original: true,
				})
				startQuestionPostingFlow('_Would you like me to ask this question for you?_', msg, state.question, state.ephemeral, state.sniffer_response_url)
				return

			} else if (answer === 'create_qa_pair') {
				msg.respond('_Glad I could be helpful! I\'m going to validate this knowledge so your peers can find it easier in the future._')
				let meta_data = JSON.parse(msg.body.actions[0].value)
				let qa_pair_index = meta_data.qa_pair_index
				let asker_user_id = meta_data.asker_user_id
				let answerer_user_id = meta_data.answerer_user_id

				let qa_pair = false
				if (!state.ephemeral) {
					qa_pair = msg.body.original_message.attachments[qa_pair_index]
					// Show selected answer
					qa_pair.actions = []
					msg.say({text: '_This is the answer!_', 'attachments': [qa_pair]})
				}
				// In a sniffing flow the answer was found so update the original yolk message to say it was found
				else if (state.ephemeral) {
					let text = 'Hey <@' + state.sniffer_asker_user_id + '>, <@' + msg.meta.user_id + '> thinks this may be the answer!\n>>>\n'
					if (state.sniffer_asker_user_id == msg.meta.user_id) {
						// The question poster sniffed and found an answer on their own
						text = '<@' + state.sniffer_asker_user_id + '> found the answer!\n>>>\n'
					}
					// Recreate the attachment and post it
					// TODO MAKE SURE SNIPPET IS NEVER TOO LONG
					let qa_pair_attachment = JSON.parse(JSON.stringify(lang_google_drive_qa_pair))
					qa_pair_attachment.title = meta_data.title
					qa_pair_attachment.text = meta_data.snippet
					qa_pair_attachment.footer = 'Found in Google Drive'
					qa_pair_attachment.actions = []
					let response = {text: text, 'attachments': [qa_pair_attachment]}

					msg.respond(state.sniffer_response_url, response)
				}

				return
			} else if (answer === 'dismiss') {
				msg.respond(msg.body.response_url, {
					text: 'Sorry I couldn\'t be of help to you. :disappointed:',
					replace_original: true,
				})

				if (state.ephemeral) { // If ephemeral get rid of the sniff prompt
					msg.respond(state.sniffer_response_url, {
						text: '',
						delete_original: true,
					})
				}
				return
			}
		} else {
			if (state.ephemeral) { // If ephemeral get rid of the sniff prompt
				state.original_msg.respond(state.sniffer_response_url, {
					text: '',
					delete_original: true,
				})
			} else {
				msg
					.say('_Please dismiss the search if you would like to start another one._')
					.route('search_flow', state)

			}
			return
		}

	})

	function dismissSearchFlow(msg, state, text) {
		msg.respond(msg.body.response_url, {
			text: text,
			replace_original: true,
		})

		if (state.ephemeral) { // If ephemeral get rid of the sniff prompt
			msg.respond(state.sniffer_response_url, {
				text: '',
				delete_original: true,
			})
		}
	}

	function startQuestionPostingFlow(text, msg, question, ephemeral = false, response_url = null) {
		let reply = JSON.parse(JSON.stringify(lang_post_question_confirmation))
		let state = {
			question: question
		}
		reply.text = text
		reply.attachments[0].title = question
		reply.attachments[0].callback_id = 'ask_callback'

		if (ephemeral) {
			reply.replace_original = false
			msg.respond(response_url, reply)
		} else {
			msg.say(reply)
		}

		msg.route('ask_confirmation', state)
	}

	function paginateMatches(qaMatches, paginationLength = 3) {
		let paginations = []
		for (var i = paginationLength; i - paginationLength < qaMatches.length; i += paginationLength) {
			paginations.push(qaMatches.slice(i - paginationLength, i))
		}
		return JSON.parse(JSON.stringify(paginations))
	}

	function formatPagination(msg, page) {
		// Render all the qa pairs in the pagination
		let formatted_pagination = []
		let formatted_qa_pair = JSON.parse(JSON.stringify(lang_qa_pair))
		for (var i = 0; i < page.length; i++) {
			if (page[i].type == 'yolk') {
				let qa_pair = page[i]
				formatted_qa_pair = JSON.parse(JSON.stringify(lang_qa_pair))
				formatted_qa_pair.title = 'Q: ' + qa_pair.question + '\nA: ' + qa_pair.latest_accepted_answer
				formatted_qa_pair.title_link = generateLinkToFirstComment(msg, qa_pair)
				formatted_qa_pair.footer = generateFooter(qa_pair.author_user_id, qa_pair.latest_accepted_user_id, qa_pair.answered_at)

				// Pass along meta data for route handling
				formatted_qa_pair.actions[0].value = JSON.stringify({
					'qa_pair_index': i,
					'qa_pair_ts': qa_pair.timestamp,
					'answer': qa_pair.latest_accepted_answer,
					'asker_user_id': qa_pair.author_user_id,
					'answerer_user_id': qa_pair.latest_accepted_user_id
				})
				formatted_pagination.push(JSON.parse(JSON.stringify(formatted_qa_pair)))
			}

			else if (page[i].type == 'google') {
				let googleFile = page[i]
				formatted_qa_pair = JSON.parse(JSON.stringify(lang_google_drive_qa_pair))
				formatted_qa_pair.title = googleFile.meta.name
				formatted_qa_pair.title_link = googleFile.meta.webViewLink
				formatted_qa_pair.text = '...' + googleFile.snippet + '...'
				formatted_qa_pair.footer = generateGoogleFooter(googleFile.meta.modifiedTime)

				// Pass along meta data for route handling
				formatted_qa_pair.actions[0].value = JSON.stringify({
					'qa_pair_index': i,
					'id': googleFile.meta.id,
					'title': googleFile.meta.name,
					'snippet': '...' + googleFile.snippet + '...',
					'webViewLink': googleFile.meta.webViewLink
				})
				formatted_pagination.push(JSON.parse(JSON.stringify(formatted_qa_pair)))
			}
		}
		return JSON.parse(JSON.stringify(formatted_pagination))
	}

	function formatResults(msg, paginations, pagination_index) {
		// For each paginatation format their qa pairs
		let formattedPaginations = []
		for (var i = 0; i < paginations.length; i++) {
			formattedPaginations.push(formatPagination(msg, paginations[i]))
		}

		let results = JSON.parse(JSON.stringify(lang_results))
		results.attachments = formattedPaginations[pagination_index]
		results.attachments.push(generatePaginationNavigation(paginations, pagination_index))
		return JSON.parse(JSON.stringify(results))
	}

	function generateLinkToFirstComment(msg, qa_pair) {
		// format: https://yolkhq.slack.com/archives/C55GAHKK5/p1493910706621195?thread_ts=1493910701.618016&cid=C55GAHKK5
		let url = 'https://'
		let team_domain = msg.meta.team_domain
		let qa_channel_id = qa_pair.channel_id
		let ts = qa_pair.comments[0].timestamp.replace('.', '')
		let thread_ts = qa_pair.timestamp.replace('.', '')

		url = url + team_domain + '.slack.com/archives/' + qa_channel_id + '/p' + ts + '?thread_ts=' + thread_ts + '&cid=' + qa_channel_id
		return url
	}

	function generateFooter(asker_user_id, user_id, timestamp) {
		return 'Asked by <@' + asker_user_id + '> and answered by <@' + user_id + '> on <!date^' + Math.floor(new Date(timestamp) / 1000) + '^{date_long} at {time}|' + Date(timestamp).toLocaleString() + '>'
	}

	function generateGoogleFooter(datetime) {
		return 'Found in Google Drive | Last modified <!date^' + Math.floor(new Date(datetime) / 1000) + '^{date_long} at {time}|' + Date(datetime).toLocaleString() + '>'
	}

	function generatePaginationNavigation(paginations, index) {
		let pagination = JSON.parse(JSON.stringify(lang_pagination))
		if (paginations.length - 1 > index && index > 0) {
			// show next button and previous button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_prev_button)))
			pagination.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		} else if (paginations.length - 1 > index) {
			// show next button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_next_button)))
		} else if (index > 0) {
			// show previous button
			pagination.actions.push(JSON.parse(JSON.stringify(lang_prev_button)))
		}

		pagination.actions.push(JSON.parse(JSON.stringify(lang_dismiss_button)))
		pagination.actions.push(JSON.parse(JSON.stringify(lang_question_button)))

		return JSON.parse(JSON.stringify(pagination))
	}

	function sendThanks(msg, qa_pair, asker_user_id, answerer_user_id) {
		// qa_pair could be null if it is ephemeral

		//
		if (msg.meta.user_id != asker_user_id && msg.meta.user_id != answerer_user_id && asker_user_id == answerer_user_id) {
			let thanks_msg = 'Hey <@' + asker_user_id + '>, <@' + msg.meta.user_id + '> found your question and answer useful! Thanks for helping out.'
			if (qa_pair) {
				thanks_msg += '\n>>>' + qa_pair.title
			}
			sendDM(msg, asker_user_id, {
				text: thanks_msg
			})
			return
		}

		if (msg.meta.user_id != asker_user_id) {
			let asker_thanks = 'Hey <@' + asker_user_id + '>, <@' + msg.meta.user_id + '> found your question useful! Thanks for helping out.'
			if (qa_pair) {
				asker_thanks += '\n>>>' + qa_pair.title
			}
			sendDM(msg, asker_user_id, {
				text: asker_thanks
			})
		}

		if (msg.meta.user_id != answerer_user_id) {
			let answerer_thanks = 'Hey <@' + answerer_user_id + '>, <@' + msg.meta.user_id + '> found your answer useful! Thanks for helping out.'
			if (qa_pair) {
				answerer_thanks += '\n>>>' + qa_pair.title
			}
			sendDM(msg, answerer_user_id, {
				text: answerer_thanks
			})
		}
	}

	function sendDM(msg, user_id, reply) {
		// Open IM with user
		let imOptions = {
			token: msg.meta.bot_token,
			user: user_id
		}
		slapp.client.im.open(imOptions, (err, imData) => {
			if (err) {
				console.log('Error opening im with user for thanks in search', err)
				return
			}
			let msgOptions = {
				token: msg.meta.bot_token,
				channel: imData.channel.id,
				text: reply.text
			}

			slapp.client.chat.postMessage(msgOptions, (err, postData) => {
				if (err) {
					console.log('Error sending thanks in search', err)
				}
			})
		})
	}

	function labelType(items, type) {
		let labelledItems = []
		for (var i = 0; i < items.length; i++) {
			labelledItems.push(JSON.parse(JSON.stringify(items[i])))
			labelledItems[i].type = type
		}
		return labelledItems
	}

	let methods = {}
	methods.startSearchFlow = startSearchFlow

	return methods
}
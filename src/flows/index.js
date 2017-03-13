'use strict'

// list out explicitly to control order
module.exports = (app) => {
	app.flows = {
		help: require('./help')(app),
		ask: require('./ask')(app),
		search: require('./search')(app),
		answer: require('./answer')(app),
		notify_updates: require('./notify_updates')(app)
	}
}
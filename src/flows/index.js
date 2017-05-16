'use strict'

// list out explicitly to control order
module.exports = (app) => {
	app.flows = {
		help: require('./help')(app),
		ask: require('./ask')(app),
		search: require('./search')(app),
		import: require('./import')(app),
		export: require('./export')(app),
		answer: require('./answer')(app),
		team_events: require('./team_events')(app),
		authenticate: require('./authenticate')(app),
		message_dispatcher: require('./message_dispatcher')(app)
	}

	return app.flows
}
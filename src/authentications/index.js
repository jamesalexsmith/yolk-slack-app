'use strict'

// list out explicitly to control order
module.exports = (app) => {
	app.authentications = {
		google: require('./google')(app)
	}

	return app.authentications
}
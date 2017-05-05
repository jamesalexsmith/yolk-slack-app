'use strict'

module.exports = (app) => {
    let db = app.db
    let slapp = app.slapp
    let lang_search_me_prompt = require('../language/sniffing/search_me_prompt.json')

    // Methods
    var methods = {}

    methods.startSniffingFlow = function (msg, text) {
        // qa pairs exist?
        db.getQAPairs(msg.meta.team_id, text)
            // TODO ORDER BY RELEVANCE
            .limit(9)
            .exec(function (err, docs) {
                if (err) {
                    console.log('Error search question models', err)
                    return
                }
                if (docs.length == 0) { // No results in Yolk
                    console.log('No db sniffer search results for ', text)
                    return
                }

                let searchMePrompt = JSON.parse(JSON.stringify(lang_search_me_prompt))
                searchMePrompt.text = '_Hey <@' + msg.meta.user_id + '>! I think I might have the answer. Would anyone like to see?_'

                // Attach the question text to the button values
                for (var i = 0; i < searchMePrompt.attachments[0].actions.length; i++) {
                    searchMePrompt.attachments[0].actions[i].value = text

                }
                msg.say(searchMePrompt)
            })
        // If yes, start search flow ephemeral to who clicked it, update previous message saying <user2> is looking for an answer
    }

    slapp.action('sniffer_callback', 'dismiss', (msg, text) => {
        msg.respond(msg.body.response_url, {
            text: '',
            delete_original: true
        })
    })

    slapp.action('sniffer_callback', 'show', (msg, text) => {
        msg.respond('Hi am I ephemeral?')
    })

    return methods
}
'use strict'

module.exports = (app) => {
    let db = app.db
    let slapp = app.slapp
    let lang_search_me_prompt = require('../language/sniffing/search_me_prompt.json')
    let searcher = require('./search')(app)

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
                    let searchMePrompt = JSON.parse(JSON.stringify(lang_search_me_prompt))
                    searchMePrompt.text = '_Hey <@' + msg.meta.user_id + '>! I couldn\'t find an answer to your question that your peers have vetted but I think it may exist in Google Drive._'

                    // Attach the question text and asker id to the button values
                    for (var i = 0; i < searchMePrompt.attachments[0].actions.length; i++) {
                        searchMePrompt.attachments[0].actions[i].value = JSON.stringify({
                            question: text,
                            sniffer_asker_user_id: msg.meta.user_id
                        })

                    }
                    msg.say(searchMePrompt)
                    return
                }

                let searchMePrompt = JSON.parse(JSON.stringify(lang_search_me_prompt))
                searchMePrompt.text = '_Hey <@' + msg.meta.user_id + '>! I think I might have the answer. Would anyone like to see?_'

                // Attach the question text and asker id to the button values
                for (var i = 0; i < searchMePrompt.attachments[0].actions.length; i++) {
                    searchMePrompt.attachments[0].actions[i].value = JSON.stringify({
                        question: text,
                        sniffer_asker_user_id: msg.meta.user_id
                    })

                }
                msg.say(searchMePrompt)
                return
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
        // Update original sniffing message letting channel know someone is searching for an answer
        let original_message = msg.body.original_message
        original_message.attachments[0].actions = []
        original_message.attachments[0].footer = '<@' + msg.meta.user_id + '> is looking for the answer!'
        msg.respond(msg.body.response_url, original_message)

        // Start search flow ephemerally for the user who click show
        let meta_data = JSON.parse(msg.body.actions[0].value)
        searcher.startSearchFlow(msg, meta_data.question, true, meta_data.sniffer_asker_user_id, msg.body.response_url)
    })

    return methods
}
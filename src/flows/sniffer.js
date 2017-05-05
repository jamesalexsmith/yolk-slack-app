'use strict'

module.exports = (mongoose) => {
    


    // Methods
    var methods = {}

    methods.startSniffingFlow = function(query, update) {
        // qa pairs exist?
        // Hey <user> I think I might have the answer, want to see?
        // Show me | No
        // If no, delete message
        // If yes, start search flow ephemeral to who clicked it, update previous message saying <user2> is looking for an answer
    }

    return methods
}
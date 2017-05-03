'use strict'

module.exports = (mongoose) => {
    var Schema = mongoose.Schema;

    // Schemas
    var questionSchema = new Schema({
        question: String,
        comments: [{
            comment: String,
            user_id: String,
            accepted: Boolean,
            timestamp: String,
            date: Date,
            reactions: {
                reaction: String,
                user_id: String
            }
        }],
        author_user_id: String,
        reactions: [{
            reaction: String,
            user_id: String
        }],
        channel_id: String,
        team_id: String,
        team_name: String,
        answered: Boolean,
        timestamp: String,
        date: Date
    })

    var validationSchema = new Schema({
        question_searched: String,
        relevent_question_timestamp_accepted: String,
        relevent_questions_timestamp_ignored: [{
            timestamp: String
        }],
        user_id: String,
        team_id: String,
        channel_id: String,
        timestamp: String,
        date: Date
    })

    // Models
    var Question = mongoose.model('Question', questionSchema)
    var Validation = mongoose.model('Validation', validationSchema)

    // Methods
    var methods = {}

    methods.updateQuestion = function(query, update) {
        Question.findOneAndUpdate(query, update, function (err, doc) {
            if (err) {
                console.log('Error updating question in mongodb', err)
            }
        })
    }

    methods.saveQuestion = function(contents) {
        let question = new Question(contents);

        question.save(function (err, question) {
            if (err) {
                console.log('Error saving question', err)
            } 
        })
    }

    methods.saveValidation = function(contents) {
        let validation = new Validation(contents);

        validation.save(function (err, question) {
            if (err) {
                console.log('Error saving validation', err)
            } 
        })
    }

    return methods
}
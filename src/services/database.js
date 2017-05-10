'use strict'

module.exports = (mongoose) => {
    var Schema = mongoose.Schema;

    // Schemas
    var questionSchema = new Schema({
        question: String,
        latest_accepted_answer: String,
        latest_accepted_user_id: String,
        comments: [{
            comment: String,
            user_id: String,
            accepted: Boolean,
            accepted_at: Date,
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
        answered_at: Date,
        timestamp: String,
        date: Date
    })

    questionSchema.index({'$**': 'text'});

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

    validationSchema.index({'$**': 'text'});

    var teamSchema = new Schema({
        team_name: String,
        team_id: String,
        paid: Boolean,
        paid_at: Date,
        launched: Boolean,
        launched_at: Date,
        added_at: Date,
    })

    var userSchema = new Schema({
        user_id: String,
        user_name: String,
        team_name: String,
        team_id: String,
        onboarded: Boolean,
        onboarded_at: Date,
        started_onboarded_at: Date,
        google_token: String
    })

    // Models
    var Question = mongoose.model('Question', questionSchema)
    var Validation = mongoose.model('Validation', validationSchema)
    var Team = mongoose.model('Team', teamSchema)
    var User = mongoose.model('User', userSchema)

    // Methods
    var methods = {}
    methods.Question = Question
    methods.Validation = Validation
    methods.Team = Team
    methods.User = User

    methods.saveTeam = function(contents) {
        let team = new Team(contents)
        team.save(function (err, team) {
            if (err) {
                console.log('Error saving team', err)
            } 
        })
    }

    methods.updateTeam = function(query, update) {
        Team.findOneAndUpdate(query, update, {upsert:true}, function (err, doc) {
            if (err) {
                console.log('Error updating team in mongodb', err)
            }
        })
    }

    methods.saveUser = function(contents) {
        let user = new User(contents)
        user.save(function (err, user) {
            if (err) {
                console.log('Error saving user', err)
            } 
        })
    }

    methods.updateUser = function(query, update) {
        User.findOneAndUpdate(query, update, {upsert:true}, function (err, doc) {
            if (err) {
                console.log('Error updating user in mongodb', err)
            }
        })
    }

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

        validation.save(function (err, validation) {
            if (err) {
                console.log('Error saving validation', err)
            } 
        })
    }

    methods.getQAPairs = function(team_id, text) {
        let searchQuery = {
			team_id: team_id,
			$text: {
				$search: text
			},
			answered: true
		}
        return Question.find(searchQuery)
    } 

    return methods
}
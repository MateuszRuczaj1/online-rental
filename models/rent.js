const mongoose = require('mongoose')
const rentsSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    games: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }],
    movies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie'
    }]
})
const Rent = mongoose.model('Rent', rentsSchema)

module.exports = Rent
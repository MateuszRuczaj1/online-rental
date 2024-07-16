const mongoose = require('mongoose')

const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    releaseYear: {
        type: String,
        required: true
    },
    rating: {
        type: String,
        required: true,
        min: 1,
        max: 10
    },
    runTime: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: true
    },
    director: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    imgs: {
        type: [String]
    },
    rentInfo: {
        type: [String]
    },
    price: {
        type: Number
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }]


})

const Movie = mongoose.model('Movie', movieSchema)
module.exports = Movie;
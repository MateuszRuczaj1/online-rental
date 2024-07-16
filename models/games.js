const mongoose = require('mongoose')
const gameSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    releaseYear: {
        type: String,
        required: true
    },

    genre: {
        type: [String],
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    platforms: {
        type: [String],
        enum: ["PC", "PS3", "PS4", "PS5", "XBOX360", "XBOX ONE", "XBOX SERIES X/S", "MAC OS", "SWITCH"],
        required: true
    },
    description: {
        type: String
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

const Game = mongoose.model('Game', gameSchema)
module.exports = Game
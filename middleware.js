const { default: mongoose } = require('mongoose')
const Game = require('./models/games')
const Rent = require('./models/rent')
const Movie = require('./models/movies')
const Review = require('./models/review')
module.exports.isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', "Musisz być zalogowany")
        return res.redirect('/login')
    }
    next()
}
module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo
    }
    next()
}
module.exports.isRentedGame = async (req, res, next) => {
    const { id } = req.params

    const _id = new mongoose.Types.ObjectId(req.user._id)
    const _gameId = new mongoose.Types.ObjectId(id)
    const game = await Game.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author',
            model: 'User',
        }
    })
    const rent = await Rent.findOne({ owner: _id, games: { $in: _gameId } })
    if (rent) {
        res.locals.rentedGame = true
        return res.render('main/showGame', { game })
    }
    res.locals.rentedGame = false
    next()
}
module.exports.isRentedMovie = async (req, res, next) => {
    const { id } = req.params

    const _id = new mongoose.Types.ObjectId(req.user._id)
    const _movieId = new mongoose.Types.ObjectId(id)
    const movie = await Movie.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author',
            model: 'User',
        }
    })
    const rent = await Rent.findOne({ owner: _id, movies: { $in: _movieId } })
    if (rent) {
        res.locals.rentedMovie = true
        return res.render('main/showMovie', { movie })
    }
    res.locals.rentedMovie = false
    next()
}
module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params
    const review = await Review.findById(reviewId).populate('author')
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'Nie można usunąc tego komentarza')
        return res.redirect(`/games/${id}`)
    }

    next()
}
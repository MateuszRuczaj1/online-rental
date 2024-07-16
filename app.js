process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
require("dotenv").config()
const mongoose = require('mongoose')
const Game = require('./models/games')
const Movie = require('./models/movies')
const User = require('./models/user')
const Review = require('./models/review')
const Rent = require('./models/rent')
const express = require('express')
const app = express()
const path = require('path')
const engine = require('ejs-mate')
const passport = require('passport')
const session = require('express-session')
const flash = require('express-flash')
const favicon = require('serve-favicon')
const methodOverride = require("method-override")
const moment = require('moment')
var nodemailer = require('nodemailer');
const LocalStrategy = require('passport-local')
const { storeReturnTo } = require('./middleware')
const { isLoggedIn } = require('./middleware')
const { isRentedGame, isRentedMovie, isReviewAuthor } = require('./middleware')
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY)
const sessionConfig = {
    secret: 'notasecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,

    }
}


app.use(favicon(path.join(__dirname, 'favicon.ico')))
app.use(flash())
app.use(express.urlencoded({ extended: true }))
app.engine('ejs', engine)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(session(sessionConfig))
app.use(methodOverride('_method'))
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.json())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    // console.log(req.session)
    res.locals.currentUser = req.user
    res.locals.error = req.flash('error')
    res.locals.success = req.flash('success')
    next()
})
moment.locale('pl')

mongoose.connect('mongodb://127.0.0.1:27017/online-rental')
    .then(() => {
        console.log("Połączono z bazą danych")
    })
    .catch(e => {
        console.log("Wystąpił błąd")
        console.log(e)
    })
app.get('/', async (req, res) => {
    const movies = await Movie.find({ title: { $in: ["Spider-Man", "Matrix", "Shrek", "Władca Pierścieni: Powrót Króla"] } })
    const games = await Game.find({ title: { $in: ["Wiedźmin 3 Dziki Gon", "The Last Of Us", "Sekiro: Shadows Die Twice", "Dziedzictwo Hogwartu"] } })
    res.render('main/index', { games: games, movies: movies })
})
app.get('/movies', isLoggedIn, async (req, res) => {

    const movies = await Movie.find({})
    const movieTitles = []
    for (let movie of movies) {
        movieTitles.push(movie.title)
    }

    res.render('main/movies', { movies, movieTitles })
})
app.get('/games', isLoggedIn, async (req, res) => {

    const games = await Game.find({})
    const gameTitles = []
    for (let game of games) {
        gameTitles.push(game.title)
    }

    res.render('main/game', { games, gameTitles })
})
app.get('/games/category', isLoggedIn, async (req, res) => {
    const { categories } = req.query
    const games = await Game.find({ genre: categories })
    const gameTitles = []
    for (let game of games) {
        gameTitles.push(game.title)
    }

    res.render('main/game', { games, gameTitles })

})

app.get('/games/:id', isLoggedIn, isRentedGame, async (req, res) => {

    const game = await Game.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author',
            model: 'User',
        }
    })
    console.log(game)
    res.render('main/showGame', { game })

})

app.get('/movies/:id', isLoggedIn, isRentedMovie, async (req, res) => {
    const movie = await Movie.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author',
            model: 'User',
        }
    })

    res.render('main/showMovie', { movie })

})
app.get('/register', (req, res) => {
    res.render('user/register')
})
app.get('/login', (req, res) => {

    res.render('user/login')
})
app.get('/logout', (req, res) => {
    req.logout(() => {

    })
    req.flash('success', 'Do widzenia!')
    res.redirect('/')
})
app.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = res.locals.returnTo || '/'
    req.flash('success', 'Witaj ponownie')
    res.redirect(redirectUrl)
})
app.post('/register', async (req, res) => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'onlinerental01@gmail.com',
            pass: 'olhf bkgj stqs krgt'
        }
    });

    try {
        const { username, email, password } = req.body
        const newUser = new User({ username, email })
        const registeredUser = await User.register(newUser, password)
        var mailOptions = {
            from: 'Online Rental',
            to: newUser.email,
            subject: 'Założenie konta',
            text: `Dziękujemy za założenie konta w naszej aplikacji. Twoja nazwa użytkownika to ${newUser.username}`
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });


        req.login(registeredUser, (err) => {
            if (err) {
                next(err)
            }
            req.flash('success', 'Użytkownik zarejestrowany')
            res.redirect('/')
        })


    } catch (error) {
        req.flash('error', error.message)
        res.redirect('register')
    }






})
app.post('/games/:id/reviews', isLoggedIn, async (req, res) => {
    const review = new Review({ ...req.body.review, author: req.user._id })
    const game = await Game.findById(req.params.id)
    game.reviews.push(review)
    await review.save()
    await game.save()
    req.flash('success', 'Dodano komentarz')
    res.redirect(`/games/${game._id}`)
})
app.post('/movies/:id/reviews', isLoggedIn, async (req, res) => {
    const review = new Review({ ...req.body.review, author: req.user._id })
    const movie = await Movie.findById(req.params.id)
    movie.reviews.push(review)
    await review.save()
    await movie.save()
    req.flash('success', 'Dodano komentarz')
    res.redirect(`/movies/${movie._id}`)
})
app.delete('/games/:id/reviews/:reviewId', isReviewAuthor, async (req, res) => {
    const { id, reviewId } = req.params
    await Game.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
    await Review.findByIdAndDelete(reviewId)
    req.flash('success', "Usunięto komentarz")
    res.redirect(`/games/${id}`)

})
app.delete('/movies/:id/reviews/:reviewId', isReviewAuthor, async (req, res) => {
    const { id, reviewId } = req.params
    await Movie.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
    await Review.findByIdAndDelete(reviewId)
    req.flash('success', "Usunięto komentarz")
    res.redirect(`/movies/${id}`)

})
app.post('/rentedGames/:userId/:gameId', async (req, res) => {
    const { userId, gameId } = req.params
    const game = await Game.findById(gameId)
    const _id = new mongoose.Types.ObjectId(userId)
    const rent = await Rent.findOne({ owner: _id })
    if (rent) {
        rent.games.push(gameId)
        await rent.save()
    }
    else {
        const newRent = new Rent({ owner: userId, games: gameId })
        await newRent.save()
    }
    const user = await User.findById(userId)
    const currentTime = moment().format('LLLL')
    game.rentInfo.push(`Wypożyczono przez ${user.username} - ${currentTime}`)
    user.transactionHistory.push(`Wypożyczono grę  ${game.title} - ${currentTime}`)
    await user.save()
    await game.save()
    req.flash('success', `Wypożyczono grę ${game.title}`)
    console.log(game)
    res.redirect(`/games/${gameId}`)

})
app.post('/rentedMovies/:userId/:movieId', async (req, res) => {
    const { userId, movieId } = req.params
    const movie = await Movie.findById(movieId)
    const _id = new mongoose.Types.ObjectId(userId)
    const rent = await Rent.findOne({ owner: _id })
    if (rent) {
        rent.movies.push(movieId)
        await rent.save()
    }
    else {
        const newRent = new Rent({ owner: userId, movies: movieId })
        await newRent.save()
    }
    req.flash('success', `Wypożyczono film ${movie.title}`)
    const user = await User.findById(_id)
    const currentTime = moment().format('LLLL')
    movie.rentInfo.push(`Wypożyczono przez ${user.username} - ${currentTime}`)
    user.transactionHistory.push(`Wypożyczono film ${movie.title} - ${currentTime}`)
    await user.save()
    await movie.save()
    res.redirect(`/movies/${movie._id}`)

})
app.get('/rented/:userId', async (req, res) => {
    const { userId } = req.params
    const _id = new mongoose.Types.ObjectId(userId)
    const rentedGames = await Rent.findOne({ owner: _id }).populate('games')
    const rentedMovies = await Rent.findOne({ owner: _id }).populate('movies')
    const gameTitles = []
    const movieTitles = []
    if (rentedGames) {
        rentedGames.games.forEach(element => {
            gameTitles.push(element)
        });
    }
    if (rentedMovies) {
        rentedMovies.movies.forEach(element => {
            movieTitles.push(element)
        });
    }


    const rentedItems = []
    gameTitles.forEach(element => {
        rentedItems.push({
            img: element.imgs[0],
            description: element.description,
            title: element.title
        }
        )
    });
    movieTitles.forEach(element => {
        rentedItems.push({
            img: element.imgs[0],
            description: element.description,
            title: element.title
        }
        )
    })
    console.log(rentedItems)
    res.render('main/library', { rentedItems })
})
app.delete('/rentedGames/:userId/:gameId', async (req, res) => {
    const { userId, gameId } = req.params
    const _id = new mongoose.Types.ObjectId(userId)
    const _gameId = new mongoose.Types.ObjectId(gameId)
    const rent = await Rent.findOneAndUpdate({ owner: _id }, { $pull: { games: _gameId } })
    const game = await Game.findById(gameId)
    const user = await User.findById(userId)
    const currentTime = moment().format('LLLL')
    user.transactionHistory.push(`Anulowano wypożyczenie gry ${game.title} - ${currentTime}`)
    await user.save()
    res.locals.rentedGame = false
    res.redirect(`/games/${gameId}`)
})
app.delete('/rentedMovies/:userId/:movieId', async (req, res) => {
    const { userId, movieId } = req.params
    const _id = new mongoose.Types.ObjectId(userId)
    const _movieId = new mongoose.Types.ObjectId(movieId)
    const movie = await Movie.findById(movieId)
    const rent = await Rent.findOneAndUpdate({ owner: _id }, { $pull: { movies: _movieId } })
    res.locals.rentedGame = false
    const user = await User.findById(userId)
    const currentTime = moment().format('LLLL')
    user.transactionHistory.push(`Anulowano wypożyczenie filmu ${movie.title} - ${currentTime}`)
    await user.save()
    res.redirect(`/movies/${movieId}`)
})
app.get('/search', async (req, res) => {
    try {
        const { search } = req.query
        const regexObj = new RegExp(search, "i")
        const searchedGame = await Game.findOne({ "title": regexObj })
        const gameId = searchedGame.id
        console.log(searchedGame)
        res.redirect(`/games/${gameId}`)
    } catch (error) {
        res.render('main/error')
    }


})
app.get('/addGame', (req, res) => {
    res.render('admin/addGame')
})
app.post('/addGame', async (req, res) => {
    const newGame = new Game(req.body)
    await newGame.save()
    console.log(newGame)
    res.redirect('/games')
})
app.get('/addMovie', (req, res) => {
    res.render('admin/addMovie')
})
app.post('/addMovie', async (req, res) => {
    const newMovie = new Movie(req.body)
    await newMovie.save()
    console.log(newMovie)
    res.redirect('/movies')
})
app.get('/transactionHistory/:userId', async (req, res) => {
    const { userId } = req.params
    const user = await User.findById(userId)

    res.render('main/transactions', { user })
})
app.post("/create-checkout-sessionGames/:gameId/:userId", async (req, res) => {

    const { gameId, userId } = req.params
    const game = await Game.findById(gameId)
    const user = await User.findById(userId)
    const _id = new mongoose.Types.ObjectId(userId)
    console.log(user)
    const storeItems = new Map([
        [1, { priceInCents: game.price * 100, name: game.title }],

    ])
    console.log(game)
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: req.body.items.map(item => {
                const storeItem = storeItems.get(item.id)
                return {
                    price_data: {
                        currency: "pln",
                        product_data: {
                            name: storeItem.name,
                        },
                        unit_amount: storeItem.priceInCents,
                    },
                    quantity: item.quantity,
                }
            }),
            success_url: `${process.env.SERVER_URL}/games`,
            cancel_url: `${process.env.SERVER_URL}/cancel.html`,
        })


        const rent = await Rent.findOne({ owner: _id })
        if (rent) {
            rent.games.push(gameId)
            await rent.save()
        }
        else {
            const newRent = new Rent({ owner: userId, games: gameId })
            await newRent.save()
        }
        const user = await User.findById(userId)
        const currentTime = moment().format('LLLL')
        game.rentInfo.push(`Wypożyczono przez ${user.username} - ${currentTime}`)
        user.transactionHistory.push(`Wypożyczono grę  ${game.title} - ${currentTime}`)
        await game.save()
        await user.save()
        req.flash('success', `Wypożyczono grę ${game.title}`)
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post("/create-checkout-sessionMovies/:movieId/:userId", async (req, res) => {
    const itemsy = req.body.items
    const { movieId, userId } = req.params
    const movie = await Movie.findById(movieId)
    const user = await User.findById(userId)
    const _id = new mongoose.Types.ObjectId(userId)
    console.log(user)
    const storeItems = new Map([
        [1, { priceInCents: 10000, name: movie.title }],

    ])
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: req.body.items.map(item => {
                const storeItem = storeItems.get(item.id)
                return {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: storeItem.name,
                        },
                        unit_amount: storeItem.priceInCents,
                    },
                    quantity: item.quantity,
                }
            }),
            success_url: `${process.env.SERVER_URL}/movies`,
            cancel_url: `${process.env.SERVER_URL}/cancel.html`,
        })


        const rent = await Rent.findOne({ owner: _id })
        if (rent) {
            rent.movies.push(movieId)
            await rent.save()
        }
        else {
            const newRent = new Rent({ owner: userId, movies: movieId })
            await newRent.save()
        }
        const user = await User.findById(userId)
        const currentTime = moment().format('LLLL')
        movie.rentInfo.push(`Wypożyczono przez ${user.username} - ${currentTime}`)
        user.transactionHistory.push(`Wypożyczono film  ${movie.title} - ${currentTime}`)
        await user.save()
        await movie.save()
        req.flash('success', `Wypożyczono film ${movie.title}`)
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})
app.get('/users', async (req, res) => {
    const allUsers = await User.find({})
    res.render('admin/users', { allUsers })
})
app.get('/users/:id', async (req, res) => {
    const { id } = req.params
    const user = await User.findById(id)
    res.render('main/transactions', { user })
})


app.listen(8080, () => {
    console.log('Nasłuchujemy na porcie 8080')
})
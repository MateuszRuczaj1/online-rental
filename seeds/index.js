const mongoose = require('mongoose')
const Game = require('../models/games')
const Movie = require('../models/movies')
const movieSeeds = require('./movieSeeds.json')
const gameSeeds = require("./gameSeeds.json")
mongoose.connect('mongodb://127.0.0.1:27017/online-rental')
    .then(() => {
        console.log('Połączono z bazą danych')
    })
    .catch((e) => {
        console.log('Wystąpił błąd')
        console.log(e)
    })

const seedDB = async () => {
    await Game.deleteMany()
    await Movie.deleteMany()
    for (let i = 0; i < gameSeeds.length; i++) {
        const gra = new Game({
            title: gameSeeds[i].title,
            releaseYear: gameSeeds[i].releaseYear,
            rating: gameSeeds[i].rating,
            genre: gameSeeds[i].genre,
            platforms: gameSeeds[i].platforms,
            description: gameSeeds[i].description,
            imgs: gameSeeds[i].imgs,
            price: gameSeeds[i].price

        })
        await gra.save()
    }
    for (let i = 0; i < movieSeeds.length; i++) {
        const film = new Movie({
            title: movieSeeds[i].Title,
            releaseYear: movieSeeds[i].Released,
            rating: movieSeeds[i].Rating,
            runTime: movieSeeds[i].Runtime,
            genre: movieSeeds[i].Genre,
            director: movieSeeds[i].Director,
            description: movieSeeds[i].Description,
            imgs: movieSeeds[i].Imgs,
            price: movieSeeds[i].Price

        })
        await film.save()
    }


}
seedDB()
    .then(() => {
        mongoose.connection.close()
    })

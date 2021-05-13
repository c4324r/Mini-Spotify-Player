require('dotenv').config()
const {app, BrowserWindow} =  require('electron')
const path = require('path')
const express = require('express')
const server = express()
const bodyParser = require('body-parser')
const passport = require('passport')
const SpotifyStrategy = require("passport-spotify").Strategy
const mongoose = require("mongoose")
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
const mongo = require("mongodb")
const { execFileSync } = require('child_process')
const expressSession = require('express-session')({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
})
const fs = require("fs")

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const Schema = mongoose.Schema
var spotifySchema = new Schema({
    spotifyId: String,
    accessToken: String,
    refreshToken: String
}) 
const spotifyUser = mongoose.model("spotifyUser", spotifySchema)

spotifyUser.deleteMany({}, (err, data) =>{
    if(err){
        return console.log(err)
    }
})

server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: false}))
server.use(expressSession)
server.use(passport.initialize())
server.use(passport.session())
server.use(express.static(__dirname))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    spotifyUser.findById(id, (err, user)=>{
        done(err, user)
    })
})

function findOrCreate(profileid, accesstoken, refreshtoken, done) {
    spotifyUser.findOne( {spotifyId: profileid}, (err, data) =>{
        if(err){
            return console.log(err)    
        }
        if(data === null){
            spotifyUser.create({spotifyId: profileid, accessToken: accesstoken, refreshToken: refreshtoken})
        }else{
            return done(null, data)
        }
    })
}

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "http://localhost:8888/auth/spotify/callback/"
        },
    (accessToken, refreshToken, expires_in, profile, done) => {
        findOrCreate(profile.id, accessToken, refreshToken, (err, user) => {
            return done(err, user)
        })
    })
)

server.get("/music", (req, res) => {
    fs.readFile("./music.json", "utf8", (err, JSONstring) => {
        const request = new XMLHttpRequest()
        var file = JSON.parse(JSONstring)
        request.open("GET", "https://api.spotify.com/v1/me/player/currently-playing")
        request.setRequestHeader("Authorization", "Bearer " + file["accessToken"])
        request.setRequestHeader("market", "ES")
        request.send()
        request.onload = () => {
            var info = JSON.parse(request.responseText)
            var music = {
                image: info["item"]["album"]["images"][0]["url"],
                song: info["item"]["name"],
                artist: info["item"]["album"]["artists"][0]["name"],
                duration: info["item"]["duration_ms"],
                current: info["progress_ms"],
                initial: false,
                spotifyId: file["spotifyId"],
                accessToken: file["accessToken"],
                refreshToken: file["refreshToken"]
            }
            var musicjson = JSON.stringify(music)
            fs.writeFile('./music.json', musicjson, err => {
                if (err) {
                    console.log('Error writing file', err)
                } else {
                    console.log('Successfully wrote file')
                }
            })
            res.sendFile(path.join(__dirname, "index.html"))
        }
    })
})

server.get("/logout", (req, res) => {
    console.log("wpeoipeworipoewri")
})

server.get("/failure", (req, res) => {
    console.log("failed authentication")
    res.json({ test: "it failed" })
})

server.get("/auth/spotify/", passport.authenticate("spotify", {scope: ["user-read-currently-playing"]}))

server.get("/auth/spotify/callback/", passport.authenticate("spotify", {failureRedirect: "/failure"}), (req, res) => {
    var info = `{"image":"https://i.scdn.co/image/ab67616d0000b273dc345fdd58bb12b44f721444","song":"per","artist":"erpo","initial":true, "spotifyId": \"${req["user"]["spotifyId"]}\", "accessToken": \"${req["user"]["accessToken"]}\", "refreshToken": \"${req["user"]["refreshToken"]}\"}`
    fs.writeFile('./music.json', info, err => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            console.log('Successfully wrote file')
        }
    })
    res.redirect("/music")
})


function createWindow(){
    const win= new BrowserWindow({
        width: 425,
        height: 125,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })
    win.setAlwaysOnTop(true, 'screen')
    win.loadFile('index.html')
    win.removeMenu()
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', ()=>{
        if(BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        var music = {
            image: "https://i.scdn.co/image/ab67616d0000b273dc345fdd58bb12b44f721444",
            song: "per",
            artist: "erpo",
            initial: true
        }
        var musicjson = JSON.stringify(music)
        fs.writeFile('./music.json', musicjson, err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        })
        app.quit()
    }
})

server.listen(process.env.PORT || 3000, () => console.log("App listenting on port " + process.env.PORT))
const fs = require("fs")
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

window.addEventListener("middleman", () => {
    var package = new XMLHttpRequest()
    package.open("GET", "http://localhost:8888/music")
    package.send()
    package.onload = () => {
        document.getElementById("document").innerHTML = package.responseText
        document.getElementById("login").click()
    }
})

window.addEventListener("update", (e) => {
    document.getElementById("title").remove()
    document.getElementById("buttons").remove()
    document.getElementById("image").src = e.detail.image
    document.getElementById("song").innerText= e.detail.song
    document.getElementById("artist").innerText= e.detail.artist
    var duration = new Date(e.detail.duration).toISOString().substr(14, 5)
    var time = e.detail.current
    var timer = setInterval(() => {
        document.getElementById("timer").innerText = new Date(time).toISOString().substr(14, 5) + " / " + duration
        time += 99.6
        if (time >= e.detail.duration) {
            clearInterval(timer)
            middleman()
        }
    }, 100)
})

function middleman(){
    const middleman = new window.CustomEvent("middleman")
    window.dispatchEvent(middleman)
}

function update(object) {
    const update = new window.CustomEvent("update", {detail: object})
    window.dispatchEvent(update)
}

window.addEventListener("DOMContentLoaded", () =>{
    fs.readFile('./music.json', 'utf8', (err, jsonString) => {
        var music = JSON.parse(jsonString)
        if(!music["initial"]){
            update(music)
        }
    }) 
})

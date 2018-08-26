// call needed packages
const express = require('express'),        // call express
    app = express(),                 // define our app using express
    bodyParser = require('body-parser'),    // call body parser
    sqlite3 = require('sqlite3'), // call sqlite-database
    cors = require('cors'), // call cors to enable cross-origin fetching
    server = require('http').Server(app), // add http to the server
    io = require('socket.io')(server); //add socket.io to the server

// configure app to use bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to use cors
app.use(cors());

// set port
const port = 3000;
// open connection to database
var db = new sqlite3.Database('../logbook.db');

app.post('/register', (req, res) => {
    try {
        if (db.all(`SELECT * FROM members WHERE username != ${req.params.username};`)) {
            db.all(`INSERT INTO members VALUES (${req.params.first_name}, ${req.params.last_name}, ${req.params.username}, ${req.params.password})`, (err, member) => {
                res.json(member, "successfully created");
            });
        }
        else {
            res.json(member, "already exists");
        }
    }
    catch (err) {
        res.json(err);
    }
});

app.post('/login', (req, res) => {

});

app.get('/trips/:id', (req, res) => {
    try {
        if (req.params.id == "all") {
            //var current_dtm = Date.now() - 3600; // TODO: use current_dtm for production use
            let current_dtm = 1506067538;
            db.all(`SELECT * FROM trips, crews, boats, members WHERE (departure >= ${current_dtm} ) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure, crew;`, function (err, trips) {
                res.json(trips);
            });
        }
        else {
            db.all(`SELECT * FROM trips, crews, boats, members WHERE (trips.id = ${req.params.id}) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;`, function (err, trips) {
                res.json(trips);
            });
        }
    } catch (err) {
        res.json(err);
    }
});

app.post('/trips/:id', (req, res) => {
    try {
        db.all(`INSERT INTO trips (boat, crew, latitude, longitude, departure, arrival) VALUES (${req.params.boat_id}, ${req.params.crew_id}, ${req.params.latitude}, ${req.params.longitude}, ${req.params.departure}, ${req.params.arrival})`, function (err, trips) {
            res.json(trips);
        });
    }
    catch (err) {
        res.json(err);
    }
});

app.post('/members/:first_name&last_name', (req, res) => {
    try {
        db.all(`INSERT INTO members (first_name, last_name) VALUES (${req.params.first_name}, ${req.params.last_name})`, (err, member) => {
            res.json(member, crew);
        });
        db.all(`INSERT INTO crews (id, member_id) VALUES (${req.params.id}, ${req.params.member_id})`, (err, crew) => {
            res.json(member, crew);
        });
    }
    catch (err) {
        res.json(err);
    }
});

app.post('/boats/:boat_name', (req, res) => {
    try {
        db.all(`INSERT INTO boats (boat_name, boat_size) VALUES (${req.params.boat_name}, ${req.params.boat_size})`, (err, boat_name) => {
            console.log(boat_name);
        });
        res.json(boat_name);
    }
    catch (err) {
        res.json(err);
    }
});

// start server
server.listen(port, () => console.log(`Listening on port ${port}`))

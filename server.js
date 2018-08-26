// call needed packages
var express = require('express');        // call express
var api = express();                 // define our app using express
var bodyParser = require('body-parser');    // call body parser
var sqlite3 = require('sqlite3'); // call sqlite-database
var cors = require('cors'); // call cors to enable cross-origin fetching

// configure api to use bodyParser
api.use(bodyParser.urlencoded({ extended: true }));
api.use(bodyParser.json());

// configure api to use cors
api.use(cors());

// set port
var port = process.env.PORT || 3000;
// open connection to database
var db = new sqlite3.Database('../logbook.db');

api.get('/trips/:id', (req, res) => {
    try {
        if (req.params.id == "all") {
            //var current_dtm = Date.now() - 3600; // TODO: use current_dtm for production use
            var current_dtm = 1506067538;
            console.log(current_dtm);
            db.all("SELECT * FROM trips, crews, boats, members WHERE (departure >= ? ) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure, crew;", current_dtm, function (err, trips) {
                res.json(trips);
            });
        }
        else {
            db.all('SELECT * FROM trips, crews, boats, members WHERE (trips.id = ?) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;', req.params.id, function (err, trips) {
                res.json(trips);
            });
        }
    } catch (err) {
        res.json(err);
    }
});

api.post('/trips/:id', (req, res) => {
    try {
        db.all('INSERT INTO trips (boat, crew, latitude, longitude, departure, arrival) VALUES (?, ?, ?, ?, ?, ?)', req.params.boat_id, req.params.crew_id, req.params.latitude, req.params.longitude, req.params.departure, req.params.arrival, function (err, trips) {
            res.json(trips);
        });
    }
    catch (err) {
        res.json(err);
    }
});

api.post('/members/:first_name&last_name', (req, res) => {
    try {
        db.all('INSERT INTO members (first_name, last_name) VALUES (?, ?)', req.params.first_name, req.params.last_name, (err, member) => {
            res.json(member, crew);
        });
        db.all('INSERT INTO crews (id, member_id) VALUES (?, ?)', req.params.id, req.params.member_id, (err, crew) => {
            res.json(member, crew);
        });
    }
    catch (err) {
        res.json(err);
    }
});

api.post('/boats/:boat_name', (req, res) => {
    try {
        db.all('INSERT INTO boats (boat_name, boat_size) VALUES (?, ?)', req.params.boat_name, req.params.boat_size, (err, boat_name) => {
            console.log(boat_name);
        });
        res.json(boat_name);
    }
    catch (err) {
        res.json(err);
    }
});

// start server
api.listen(port);
console.log('pssst... API is listening on port: ' + port);
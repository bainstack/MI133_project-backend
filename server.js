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

// start server
server.listen(port, () => console.log(`Listening on port ${port}`));

app.post('/register', (req, res) => {
    try {
        if (db.all('SELECT * FROM members WHERE username == ${req.body.username} OR (first_name == ${req.body.first_name} AND last_name == ${req.body.last_name});')) {
            res('user ${req.body.username} already exists');
        }
        else {
            db.all('INSERT INTO members VALUES (${req.body.first_name}, ${req.body.last_name}, ${req.body.username}, ${req.body.password});', (err, member) => {
                res(member, '${req.body.username}successfully created');
            });
        }
    } catch (err) {
        res.json(err);
    }
});

app.post('/login', (req, res) => {
    try {
        if (db.get('SELECT * FROM members WHERE username == ? AND password == ?;', req.body.username, req.body.password)) {
            io.on('connection', (socket) => {
                console.log('New client connected');

                socket.on('view trips', (id) => {
                    try {
                        if (id == "all") {
                            //var current_dtm = Date.now() - 3600; // TODO: use current_dtm for production use
                            let current_dtm = 1506067538;
                            db.all('SELECT * FROM trips, crews, boats, members WHERE (departure >= ? ) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure, crew;', current_dtm, function (err, trips) {
                                socket.emit(json(trips));
                            });
                        }
                        else {
                            db.all('SELECT * FROM trips, crews, boats, members WHERE (trips.id = ?) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;', id, function (err, trips) {
                                socket.emit(json(trips));
                            });
                        }
                    } catch (err) {
                        socket.emit(json(err));
                    };
                });

                socket.on('create trip', (boat_id, crew_id, latitude, longitude, departure, arrival) => {
                    try {
                        db.all('INSERT INTO trips (boat, crew, latitude, longitude, departure, arrival) VALUES (?, ?, ?, ?, ?, ?);', boat_id, crew_id, latitude, longitude, departure, arrival, (err, trips) => {
                            io.sockets.emit(trips);
                        });
                    } catch (err) {
                        socket.emit(json(err));
                    }
                });

                socket.on('join trip', (crew_id, member_id) => {
                    try {
                        db.all('INSERT INTO crews (id, member_id) VALUES (?, ?);', crew_id, member_id, (err, trips) => {
                            io.sockets.emit(trips);
                        });
                    } catch (err) {
                        socket.emit(json(err));
                    }
                });

                socket.on('create boat', (boat_name, boat_size) => {
                    try {
                        db.all('INSERT INTO boats (boat_name, boat_size) VALUES (?, ?);', boat_name, boat_size, (err, boat) => {
                            io.sockets.emit(boats);
                        });
                    } catch (err) {
                        socket.emit(json(err));
                    }
                });

                // disconnect is fired when a client leaves the server
                socket.on('disconnect', () => {
                    console.log('user disconnected')
                });
            });
        }
        else {
            res('login failed');
        };
    } catch (err) {
        res.json(err);
    };
});


// call needed packages
let express = require('express'),        // call express
    cors = require('cors'), // call cors to enable cross-origin fetching
    app = express(),                 // define our app using express
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),    // call body parser
    sqlite3 = require('sqlite3').verbose(), // call sqlite-database
    server = require('http').Server(app), // add http to the server
    passport = require('passport'), LocalStrategy = require('passport-local').Strategy, // call passport with local strategy for usage of db-entries
    path = require('path') //use path module for cross-os-usage of nodejs app
    ;

// configure app to enable cors
app.use(cors());

app.use(cookieParser());
// configure app to use bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to use passport
app.use(passport.initialize());
app.use(passport.session());

// set port
const port = 3000;
// open connection to database
const db_path = path.resolve(__dirname, '../logbook.db');
let db = new sqlite3.Database(db_path, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the logbook SQlite database.');
});

// start server
server.listen(port, () => console.log(`Listening on port ${port}`));

passport.use(new LocalStrategy(
    (username, password, done) => {
        db.get('SELECT * FROM members WHERE username == ? AND password == ?;', username, password, (err, user) => {
            //User.findOne({ username: username }, function (err, user) {
            if (err) {
                console.log(err);
                return done(err);
            }
            if (!user) {
                console.log('Incorrect username.');
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!password) {
                console.log('Incorrect password.');
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.post('/register', (req, res) => {
    db.run('SELECT * FROM members WHERE username == ? OR (first_name == ? AND last_name == ?)', req.body.username, req.body.first_name, req.body.last_name, (err, user) => {
        if (err) {
            console.log(err);
            return res.send(err.message);
        }
        if (user) {
            console.log(user);
            return res.json({ success: false, message: `User ${req.body.username} already exists!` });
        }
        else {
            console.log('registered ' + req.body.first_name + ' ' + req.body.last_name + ' as ' + req.body.username);
            db.all('INSERT INTO members (username, first_name, last_name, password) VALUES (?, ?, ?, ?);', req.body.username, req.body.first_name, req.body.last_name, req.body.password);
            console.log('Registered new user: ' + req.body.username);
            return res.json({ success: true, message: `${req.body.username} successfully created` });
        }
    })
});

app.post('/login', (req, res) => {
    console.log('User ' + req.body.username + ' connected');
    res.send(JSON.stringify({ message: 'Congrats ' + req.body.username + '! You logged in successfully!' }));
});

app.get('/view_trips', (req, res) => {
    if (id == "all") {
        //var current_dtm = Date.now() - 3600; // TODO: use current_dtm for production use
        let current_dtm = 1506067538;
        db.all('SELECT * FROM trips, crews, boats, members WHERE (departure >= ? ) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure, crew;', current_dtm, (err, trips) => {
            if (err) {
                console.log('Error when requesting ALL /view_trips');
                return res.json(err.message);
            }
            if (trips) {
                console.log('Successfully requested /view_trips');
                return res.json({ success: true, trips });
            }
            else {
                console.log('/view_trips requested but no trips found');
                return res.json({ success: false, message: `No trips found` });
            };
        });
    }
    else {
        db.all('SELECT * FROM trips, crews, boats, members WHERE (trips.id = ?) AND (trips.crew = crews.id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;', req.body.id, function (err, trip) {
            if (err) {
                console.log(`Error when requesting /view_trips with id ${id}`);
                return res.json(err.message);
            }
            if (trip) {
                console.log(`Successfully requested /view_trips with id ${id}`);
                return res.json({ success: true, trip });
            }
            else {
                console.log(`Successfully requested /view_trips with id ${id} but nothing found`);
                return res.json({ success: false, message: `trip not found` });
            };
        });
    }
});

app.post('/create_trip', (req, res) => {
    console.log(req.body);
    console.log(`INSERT INTO trips (boat, latitude, longitude, departure, arrival) VALUES (${req.body.boat_id}, ${req.body.latitude}, ${req.body.longitude}, ${req.body.departure}, ${req.body.arrival})`);
    db.run('INSERT INTO trips (boat, latitude, longitude, departure, arrival) VALUES (?, ?, ?, ?, ?)', req.body.boat_id, req.body.latitude, req.body.longitude, req.body.departure, req.body.arrival, function (err) {
        if (err) {
            console.log(`Error when requesting /create_trip`);
            return res.json(err.message);
        }
        if (this.changes == 1) {
            console.log(`Successfully requested /create_trip`);
            let row_id = this.lastID;
            req.body.crew.forEach(element => {
                db.run('INSERT INTO crews (id, member_id) VALUES (?, (SELECT username from members WHERE username = ?))', row_id, element, function (err) {
                    if (err) {
                        console.log(`Error when creating new crew-trip-relation`);
                        return res.json(err.message);
                    }
                    if (this.changes == 1) {
                        return res.json({ success: true, message: 'new trip and crew-trip-relation created' });
                    }
                });
            });
        }
        else {
            console.log(this.changes);
            console.log(`Successfully requested /create_trip but didn't work`);
            return res.json({ success: false, message: "trip couldnt't be created" });
        };
    });
});

app.post('/join trip', (req, res) => {
    db.run('INSERT INTO crews (id, member_id) VALUES (?, ?);', req.body.crew_id, req.body.member_id, (err, trip) => {
        if (err) {
            return res.json(err.message);
        }
        if (trip) {
            return res.json({ success: true, trip });
        }
        else {
            return res.json({ success: false, message: `couldn't join trip` });
        };
    });
});

app.get('/get_boats', (req, res) => {
    db.all('SELECT * FROM boats;', (err, boat) => {
        if (err) {
            return res.json(err.message);
        }
        return res.json(boat);
    });
});

app.post('/create_boat', (req, res) => {
    console.log('requested /create_boat');
    db.run('INSERT INTO boats (boat_name, boat_size) VALUES (?, ?);', req.body.boat_name, req.body.boat_size, (err, boat) => {
        if (err) {
            return res.json(err.message);
        }
        if (boat) {
            return res.json({ success: true, boat });
        }
        else {
            return res.json({ success: false, message: `boat couldn't get created` });
        };
    });
});

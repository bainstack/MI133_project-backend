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


db.getAsync = function (sql) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.get(sql, function (err, row) {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};

db.allAsync = function (sql) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.all(sql, function (err, rows) {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};

db.runAsync = function (sql) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.run(sql, function (err) {
            if (err)
                reject(err);
            else
                resolve(this);
        });
    })
};

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
    db.all('SELECT id FROM members WHERE id = ?;', req.body.username, (err, user) => {
        if (err) {
            console.log('User ' + req.body.username + ' connected');
            return res.json({ success: true, user: user });
        }
        else {
            console.log(`/login requested but user ${req.body.username} not found!`);
            return res.json({ success: false, message: `User not found!` });
        }
    })
});

app.post('/view_trips', (req, res) => {
    console.log('view_trips called');
    if (req.body.id == "all") {
        //var current_dtm = Math.floor((Date.now() / 1000) - 3600);
        var current_dtm = 1530000000;
        console.log(current_dtm);
        db.all('SELECT * FROM trips LEFT JOIN boats ON trips.boat = boats.id LEFT JOIN crews ON trips.id = crews.trip_id LEFT JOIN members ON crews.member_id = members.id WHERE trips.departure >= ? ORDER BY crews.trip_id DESC LIMIT 20;', current_dtm, (err, trips) => {
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
        db.all('SELECT * FROM trips, crews, boats, members WHERE (trips.id = ?) AND (trips.crew = crews.trip_id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;', req.body.id, function (err, trip) {
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

app.post('/create_trip', async (req, res, next) => {
    var stmt;
    var check = true;
    var memberID;
    var tripID;

    for (i = 0; i < req.body.crew.length; i++) {
        stmt = `SELECT * FROM members where username = "${req.body.crew[i]}";`;
        if (await db.getAsync(stmt) == false) check = false;
    }
    console.log(check);
    if (check == false) res.json({ success: false, message: 'crew_check failed' });
    if (check == true) {
        stmt = `INSERT INTO trips (boat, latitude, longitude, departure, arrival) VALUES (${req.body.boat_id}, ${req.body.latitude}, ${req.body.longitude}, ${req.body.departure}, ${req.body.arrival});`;
        console.log(stmt);
        var tripID = await db.runAsync(stmt);
        console.log("ID von Trip-creation: " + tripID.lastID);
        if (tripID.changes >= 1) {
            for (i = 0; i < req.body.crew.length; i++) {
                stmt = `SELECT id FROM members where username = "${req.body.crew[i]}"`;
                console.log(stmt);
                memberID = await db.getAsync(stmt);
                console.log(memberID.id);
                stmt = `INSERT INTO crews(trip_id, member_id) VALUES(${tripID.lastID}, ${memberID.id});`;
                console.log(stmt);
                check = await db.runAsync(stmt);
                console.log(check.changes);
            }
            res.json({ success: true, message: 'crew_check passed, trip inserted, crew assigned to trip' });
        }
    }
});

app.post('/join trip', (req, res) => {
    db.run('INSERT INTO crews (trip_id, member_id) VALUES (?, ?);', req.body.crew_id, req.body.member_id, (err, trip) => {
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
    console.log('get_boats-route called');
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

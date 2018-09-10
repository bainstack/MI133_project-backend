// call needed packages
var express = require('express'),        // call express
    cors = require('cors'), // call cors to enable cross-origin fetching
    app = express(),                 // define our app using express
    bodyParser = require('body-parser'),    // call body-parser
    cookieParser = require('cookie-parser'); // call cookie-parser
sqlite3 = require('sqlite3').verbose(), // call sqlite-database
    server = require('http').Server(app), // add http to the server
    session = require('express-session'), // add session middleware
    SQLiteStore = require('connect-sqlite3')(session), // add SQLiteStore to use it for session
    path = require('path') //use path module for cross-os-usage of nodejs app
    ;

// configure app to enable cors
app.use(cors());

// configure app to use bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//configure app to use cookieParser
app.use(cookieParser());

app.use(session({
    store: new SQLiteStore,
    secret: 'MI_133_project-backend',
    cookie: { maxAge: 60 * 60 * 1000 }, // cookies last 1 hour
    resave: false,
    saveUninitialized: true
}));

// set port
const port = 3000;
// open connection to database
const db_path = path.resolve(__dirname, '../logbook.db');
let db = new sqlite3.Database(db_path, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the logbook SQLite database.');
});

// start server
server.listen(port, () => console.log(`Listening on port ${port}`));

// Authentication and Authorization Middleware
var auth = function (req, res, next) {
    if (req.session && req.session.id) return next();
    else if (req.session && req.session) {
        req.session.admin = true;
        return next();
    }
    else
        return res.sendStatus(401);
};

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

app.post('/register', async (req, res, next) => {
    var stmt = `SELECT * FROM members WHERE username = "${req.body.username}";`;
    console.log(stmt);
    var check = await db.allAsync(stmt);
    if (check.length == 0) {
        stmt = `INSERT INTO members (username, first_name, last_name, password) VALUES ('${req.body.username}', '${req.body.first_name}', '${req.body.last_name}', '${req.body.password}');`;
        console.log(stmt);
        db.run(stmt, (err) => {
            if (err) {
                res.json(err.message);
            }
            else {
                res.json({ success: true, message: `${req.body.username} successfully created` });
            }
        })
    }
    else if (check.length != 0) {
        res.json({ success: false, message: `user ${req.body.username} already exists` });
    }
});

app.post('/login', (req, res) => {
    var stmt = `SELECT id, password FROM members WHERE username = '${req.body.username}' AND password = '${req.body.password}';`;
    console.log(stmt);
    db.all(stmt, (err, user) => {
        console.log(stmt);
        if (err) {
            res.json({ success: false, message: err.message });
        }
        if (user.length != 0) {
            if (user) req.session.user_id = user[0].id;
            console.log(req.session);
            res.json({ success: true, user: user[0].id });
        }
        else {
            res.json({ success: false, message: `User not found!` });
        }
    })
});

// Logout endpoint
app.get('/logout', function (req, res) {
    req.session.destroy();
    res.json({ message: "logout success!" });
});

app.post('/view_trips', auth, (req, res) => {
    if (req.body.id == "all" && req.session.admin == true) {
        //var current_dtm = Math.floor((Date.now() / 1000) - 3600);
        var current_dtm = 1530000000;
        var stmt = `SELECT * FROM trips LEFT JOIN boats ON trips.boat = boats.id LEFT JOIN crews ON trips.id = crews.trip_id LEFT JOIN members ON crews.member_id = members.id WHERE trips.departure >= ${current_dtm} ORDER BY crews.trip_id DESC LIMIT 20;`;
        db.all(stmt, (err, trips) => {
            if (err) {
                res.json(err.message);
            }
            if (trips) {
                res.json({ success: true, trips });
            }
            else {
                res.json({ success: false, message: `No trips found` });
            };
        });
    }
    else {
        db.all('SELECT * FROM trips, crews, boats, members WHERE (trips.id = ?) AND (trips.crew = crews.trip_id) AND (crews.member_id = members.id) AND (trips.boat = boats.id) ORDER BY trips.departure;', req.body.id, function (err, trip) {
            if (err) {
                console.log(`Error when requesting /view_trips with id ${id}`);
                res.json(err.message);
            }
            if (trip) {
                console.log(`Successfully requested /view_trips with id ${id}`);
                res.json({ success: true, trip });
            }
            else {
                console.log(`Successfully requested /view_trips with id ${id} but nothing found`);
                res.json({ success: false, message: `trip not found` });
            };
        });
    }
});

app.post('/create_trip', auth, async (req, res, next) => {
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

app.post('/join_trip', auth, (req, res) => {
    var stmt = `INSERT INTO crews (trip_id, member_id) VALUES (${req.body.trip_id}, ${req.body.member_id});`;
    console.log(stmt);
    db.run(stmt, (err) => {
        if (err) {
            res.json(err.message);
        }
        else {
            res.json({ success: true, message: `successfully joined trip` });
        };
    });
});

app.get('/get_boats', auth, (req, res) => {
    var stmt = `SELECT * FROM boats;`;
    console.log(stmt);
    db.all(stmt, (err, boat) => {
        if (err) {
            res.json(err.message);
        }
        res.json(boat);
    });
});

app.post('/create_boat', auth, (req, res) => {
    var stmt = `INSERT INTO boats (boat_name, boat_size) VALUES (${req.body.boat_name}, ${req.body.boat_size});`
    console.log(stmt);
    if (req.session.admin == true) {
        db.run(stmt, (err) => {
            if (err) {
                res.json(err.message);
            }
            else {
                res.json({ success: true, message: `successfluyy created new boat` });
            };
        });
    }
    else res.sendStatus(401);
});

app.post('/start_trip', auth, (req, res) => {
    var stmt = `UPDATE trips SET active = 1, departure = '${req.body.departure}' WHERE id =${req.body.trip_id};`;
    console.log(stmt);
    db.run(stmt, (err) => {
        if (err) {
            res.json(err.message);
        }
        else {
            res.json({ success: true, message: `successfully started trip` });
        };
    });
});

app.post('/end_trip', auth, (req, res) => {
    var stmt = `UPDATE trips SET active = 2, arrival = '${req.body.arrival}' WHERE id =${req.body.trip_id}`;
    console.log(stmt);
    db.run(stmt, (err) => {
        if (err) {
            res.json(err.message);
        }
        else {
            res.json({ success: true, message: `successfully stopped trip` });
        };
    });
});

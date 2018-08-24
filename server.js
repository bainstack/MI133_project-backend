// call needed packages
var express = require('express');        // call express
var api = express();                 // define our app using express
var bodyParser = require('body-parser');    // call body parser
var sqlite3 = require('sqlite3'); // call sqlite-database

// configure api to use bodyParser()
api.use(bodyParser.urlencoded({ extended: true }));
api.use(bodyParser.json());

// set port
var port = process.env.PORT || 3000;
// open connection to database
var db = new sqlite3.Database('../logbook.db');

api.get('/crews/:id', function (req, res) {
    try {
        if (req.params.id == "all") {
            db.all('SELECT * FROM crews', function (err, crews) {
                res.json(crews);
            });
        }
        else {
            db.all('SELECT * FROM crews WHERE id = ?', req.params.id, function (err, crews) {
                res.json(crews);
            });
        }
    } catch (err) {
        next(err);
    }
});

// start server
api.listen(port);
console.log('pssst... API is listening on port: ' + port);
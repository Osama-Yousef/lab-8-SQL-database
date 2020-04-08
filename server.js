'use strict';

// To get our environment variable  from the .env file
require('dotenv').config();

// Application Dependencies (getting the libraries)
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');// to get the data from the api


//Getting the PG library (1)
const pg = require('pg'); // for the database

//Creating a new client using the PG constructor function from the pg library (2)
const client = new pg.Client(process.env.DATABASE_URL); // create a client from pg using the url to use it later on
client.on('error', err => {
  throw new Error(err);
});

// Application Setup
const PORT = process.env.PORT || 4000; // to choose the port of server from .env file or 4000
const app = express(); // to create the server
app.use(cors()); // to use the library from our app & to make server respond to any request comming from any origin

app.get('/', (request, response) => {
  response.send('Home Page!');
});

// Route Definitions
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailsHandler);
app.use('*', notFoundHandler);
app.use(errorHandler);

// Route Handlers
// (4)

function locationHandler(request, response) {

  const city = request.query.city; // ro get my city from query
  const SQL = 'SELECT * FROM locations WHERE search_query = $1';// to search my location if database have this thing

  const values = [city];
  client.query(SQL, values).then((result) => {

    if (result.rows.length > 0) { // to see if the data base have what i want 

      response.status(200).json(result.rows[0]);// result is array and we want to return object so we put rows[0]

    } else {

      superagent(
        `https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json`
      ).then((res) => {
        const geoData = res.body;
        const locationData = new Location(city, geoData);
        const SQL = 'INSERT INTO locations(search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *'; // We can remove RETURNING *
        const values = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];
        client.query(SQL, values).then(result => {
          response.status(200).json(result.rows[0]);
        });
      });
    }

  })
    .catch((err) => { errorHandler(err, request, response) });

}


function weatherHandler(request, response) {
  superagent(
    `https://api.weatherbit.io/v2.0/forecast/daily?city=${request.query.search_query}&key=${process.env.WEATHER_API_KEY}`
  )
    .then((weatherRes) => {
      // console.log(weatherRes);
      const weatherSummaries = weatherRes.body.data.map((day) => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch((err) => errorHandler(err, request, response));
}





function trailsHandler(request, response) {
  const latitude = request.query.latitude;
  const longitude = request.query.longitude;
  // console.log(latitude, longitude)
  superagent(
    `https://www.hikingproject.com/data/get-trails?lat=${latitude}&lon=${longitude}&maxResults=10&maxDistance=400&key=${process.env.TRAILS_API_TOKEN}`
  )
    .then(trailRes => {
      // console.log(trailRes.body.trails);
      let trailsDataArray = [];
      trailRes.body.trails.map(trailsLoc => {
        const trailsEnteries = new Trailslocations(trailsLoc);
        trailsDataArray.push(trailsEnteries);
      });
      // console.log(trailsDataArray[0])
      response.status(200).send(trailsDataArray);
    })
    .catch((err) => {
      errorHandler(err, request, response);
    });

}






function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData[0].display_name;
  this.latitude = geoData[0].lat;
  this.longitude = geoData[0].lon;
}


function Weather(day) {
  this.forecast = day.weather.description;
  this.time = new Date(day.valid_date).toString().slice(0, 15);
}


function Trailslocations(trailData) {
  this.name = trailData.name;
  this.location = trailData.location;
  this.length = trailData.length;
  this.stars = trailData.stars;
  this.star_votes = trailData.starVotes;
  this.summary = trailData.summary;
  this.trail_url = trailData.url;
  this.conditions = trailData.conditionStatus;
  this.condition_date = trailData.conditionDate.slice(0, 10);
  this.condition_time = trailData.conditionDate.slice(11, 18);
  // console.log(this)
}

function notFoundHandler(request, response) {
  response.status(404).send('huh?');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}

// Make sure the server is listening for requests 
client
  .connect()
  .then(() => {  // to connect directly to database (3)
    app.listen(PORT, () => {
      console.log(`App is listening on ${PORT}`);
    });
  }).catch((err) => {
    throw new Error(`startup error ${err}`);
  });

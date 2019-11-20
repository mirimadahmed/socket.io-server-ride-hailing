var express = require('express');
var app = express();
var path = require('path');
var firebase = require("firebase");
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var firebaseConfig = {
    apiKey: "AIzaSyAFSN77CtgOKAQ2VmJpwS90QuLqjIjyhzI",
    authDomain: "moover-c222d.firebaseapp.com",
    databaseURL: "https://moover-c222d.firebaseio.com",
    projectId: "moover-c222d",
    storageBucket: "moover-c222d.appspot.com",
    messagingSenderId: "747533031517",
    appId: "1:747533031517:web:f2a12d000f1152971ad5b4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();

server.listen(port, () => {
    console.log('Server listening at port %d', port);

    database.ref('riders').on('value', function (snapshot) {
        console.log(snapshot.val());
    });
});

io.on('connection', (socket) => {
    var addedUser = false;

    // when the driver connect emitted
    socket.on('connect driver', (driver) => {
        if (addedUser) return;
        // Check if already in available or booked
        // if not in both above add in available

        socket.userid = driver.userid;
        addedUser = true;
    });

    // when the user connect emitted
    socket.on('connect user', (user) => {
        if (addedUser) return;
        // if already in booked send back the ride to user

        socket.userid = user.userid;
        addedUser = true;
    });

    // ask for driver
    // send notification to drivers
    socket.on('give ride', (user) => {
        // if already in booked send back the ride to user
        // otherwise send notifications to available riders
    });

    // driver accepting ride
    // send notification to driver and user
    socket.on('accept ride', (driver) => {
        // if first one send back to user
    });

    // when the driver or user disconnects
    socket.on('disconnect', () => {
        if (addedUser) {
            // if available remove from there

        }
    });
});
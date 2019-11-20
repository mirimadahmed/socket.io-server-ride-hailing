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

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
    var addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (username) => {
        if (addedUser) return;

        // we store the username in the socket session for this client
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', () => {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});
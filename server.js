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
var bookedItems = [];
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();


server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
// Routing
app.use(express.static(path.join(__dirname, 'public')));
io.on('connection', (socket) => {
    console.log("Server connected");
    var addedUser = false;

    // when the driver connect emitted
    socket.on('connect driver', (driver) => {
        console.log("driver data");
        console.log(driver);
        if (addedUser) {
            console.log('Already connected');
            return;
        }
        // Check if already in available or booked
        // if not in both above add in available
        console.log(driver.id);
        database.ref('available/' + driver.id)
            .once('value', function (snapshot) {
                if (snapshot.val() == null) {
                    database.ref('ride')
                        .once('value', function (snapshot) {
                            bookedItems = snapshot.val();
                            if(bookedItems != null)
                            {
                                Object.keys(bookedItems).forEach(element => {
                                    if (bookedItems[element].id == driver.id) {
                                        socket.id = driver.id;
                                        addedUser = true;
                                        console.log(bookedItems[element]);
                                        return;
                                    }
                                });
                            }
                            database.ref('available').child(driver.id).set(driver);
                            socket.join('available');
                        });
                }
            });
        addedUser = true;
        console.log('Driver Connected');
    });

    // when the user connect emitted
    socket.on('connect user', (user) => {
        console.log(user);
        console.log(user.userid);
        if (addedUser) {
            console.log('Already connected');
            return;
        }
        // if already in booked send back the ride to user
        database.ref('ride')
            .once('value', function (snapshot) {
                if(snapshot.val() != null)
                bookedItems = snapshot.val();
                Object.keys(bookedItems).forEach(element => {
                    if (bookedItems[element].userid == user.userid) {
                        socket.userid = user.userid;
                        addedUser = true;
                        console.log(bookedItems[element]);
                        return;
                    }
                });
            });

        socket.userid = user.userid;
        addedUser = true;
        console.log('User Connected');
    });

    // ask for driver
    // send notification to drivers
    socket.on('give ride', (ride) => {
        // send notifications to available drivers
        console.log(ride);
        if (Object.keys(socket.in('available')).length > 0) {
            database.ref('ride').push(ride).then(snapshot => {
                ride['key'] = snapshot.key
                socket.to('available').emit('ride request', ride);
            })
            console.log('Sent to drivers');
        } else {
            console.log('No drivers available');
        }
    });

    // driver accepting ride
    // send notification to driver and user
    socket.on('accept ride', (driver) => {
        // if first one send back to user
        database.ref('ride').child(driver.key).once('value', snapshot => {
            let ride = snapshot.val()
            if(ride != null) {
                if(!ride.isBooked) {
                    // set is Booked 
                    // attach driver details and send back on firebase and send back msg to user
                    database.ref('ride').child(driver.key).set(driver)
                    socket.emit('got ride', driver)
                    socket.leave('available')
                    database.ref('available').child(driver.id).remove()
                } 
            }
        }) 
    });

    socket.on('end ride', (id) => {
        let rideInfo
        database.ref('ride').child(id).once('value', (snapshot) => {
            rideInfo = snapshot.val()
        })
        database.ref('ride').child(id).remove()
        database.ref('available').child(rideInfo.id).set(rideInfo)
        socket.join('available')
    });

    // when the driver or user disconnects
    socket.on('disconnect driver', (driver) => {   
        console.log("driver disconnected");
        console.log(driver);
        if (addedUser) {
            // if available remove from there
            database.ref('avaiable').child(driver.id).remove();
            socket.leave('available')
        }
    });
});

var _sockets = new Set();
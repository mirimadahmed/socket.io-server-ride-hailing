var express = require('express');
var app = express();
var path = require('path');
var firebase = require("firebase");
var admin = require('firebase-admin');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var firebaseConfig = {
    apiKey: "--------------------------------------",
    authDomain: "--------------------------------------",
    databaseURL: "--------------------------------------",
    projectId: "--------------------------------------",
    storageBucket: "--------------------------------------",
    messagingSenderId: "--------------------------------------",
    appId: "--------------------------------------"
};
var bookedItems = [];
// Initialize Firebase
admin.initializeApp(firebaseConfig);
const db = admin.firestore();
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
        // Check if already in available or booked
        // if not in both above add in available
        let haveRide = false
        console.log(driver.id);
        database.ref('available').child(driver.id)
            .once('value', (snapshot) => {
                console.log(snapshot.val())
                if (snapshot.val() == null) {
                    database.ref('ride')
                        .once('value', (snapshot) => {
                            bookedItems = snapshot.val();
                            console.log(bookedItems)
                            if (bookedItems != null) {
                                Object.keys(bookedItems).forEach(element => {
                                    if (bookedItems[element].id == driver.id && bookedItems[element].isBooked) {
                                        console.log(bookedItems[element]);
                                        socket.join(element)
                                        io.in(element).emit('got ride', bookedItems[element])
                                        haveRide = true
                                        return
                                    }
                                });
                            }

                        });
                } else {
                    socket.join('available');
                    return;
                }
                if (!haveRide) {
                    database.ref('available').child(driver.id).set(driver);
                    socket.join('available');
                }
            });


        console.log('Driver Connected');
    });

    // when the user connect emitted
    socket.on('connect user', (user) => {
        console.log(user);
        // if already in booked send back the ride to user
        database.ref('ride')
            .once('value', function (snapshot) {
                if (snapshot.val() != null) {
                    bookedItems = snapshot.val();
                    Object.keys(bookedItems).forEach(element => {
                        if (bookedItems[element].userid == user.userid && bookedItems[element].isBooked) {
                            addedUser = true;
                            socket.join(element)
                            io.in(element).emit('got ride', bookedItems[element])
                            // socket.emit('got ride', bookedItems[element])
                            console.log(bookedItems[element]);
                            return;
                        }
                    });
                }

            });
        console.log('User Connected');
    });

    // ask for driver
    // send notification to drivers
    socket.on('give ride', (ride) => {
        // send notifications to available drivers
        console.log(ride);
        if (Object.keys(socket.in('available')).length > 0) {
            database.ref('ride').push(ride).then(snapshot => {
                let newRideObject = { key: snapshot.key, ...ride }
                io.in('available').emit('ride request', newRideObject);
                socket.join(snapshot.key)
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
            if (ride != null) {
                if (!ride.isBooked) {
                    // set is Booked 
                    // attach driver details and send back on firebase and send back msg to user
                    database.ref('ride').child(driver.key).set(driver)
                    socket.leave('available')
                    database.ref('available').child(driver.id).remove()
                    socket.join(driver.key)
                    io.in(driver.key).emit('got ride', driver)
                }
            }
        })
    });

    socket.on('driver location', (driver) => {
        database.ref('ride').child(driver.key).update({
            ...driver
        })
    })

    socket.on('end ride', (driver) => {
        database.ref('ride').child(driver.key).remove()
        database.ref('available').child(driver.id).set({
            id: driver.id,
            username: driver.username,
            photoUrl: driver.photoUrl,
            rating: driver.rating,
            phone: driver.phone
        })
        database.ref('finished').child(driver.key).set(driver)
        socket.join('available')
        io.emit('end ride', driver)
        io.of('/').in(driver.key).clients((error, socketIds) => {
            if (error) throw error;

            socketIds.forEach(socketId => io.sockets.sockets[socketId].leave(driver.key));

        });
    });

    // when the driver or user disconnects
    socket.on('disconnect driver', (driver) => {
        console.log("driver disconnected");
        console.log(driver);
        database.ref('available').child(driver.id).remove();
        socket.leave('available')
    });
});

var _sockets = new Set();

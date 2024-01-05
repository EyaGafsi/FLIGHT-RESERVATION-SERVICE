"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const reservation_model_1 = __importDefault(require("./reservation.model"));
const body_parser_1 = __importDefault(require("body-parser"));
const nodemailer = require('nodemailer');
const cors = require('cors');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const memoryStore = new session.MemoryStore();
const kcConfig = {
    clientId: 'flyware-client',
    bearerOnly: true,
    serverUrl: 'http://localhost:8080',
    realm: 'Flyware-Realm',
    publicClient: true
};
const keycloak = new Keycloak({ store: memoryStore }, kcConfig);
const app = (0, express_1.default)();
app.use(cors());
app.use(session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
}));
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'teamflyware@gmail.com',
        pass: 'otac ngky ijkj cpcn'
    }
});
app.use(keycloak.middleware());
const PORT = process.env.PORT || 3001;
const eurekaHelper = require('./eureka-helper');
eurekaHelper.registerWithEureka('flight-reseration-server', PORT);
app.use(body_parser_1.default.json());
const uri = "mongodb://127.0.0.1:27017/Flyware";
mongoose_1.default.connect(uri, (err) => {
    if (err)
        console.log(err);
    else
        console.log("Mongo Database connected successfully");
});
app.post('/reserver', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, flightId, nbAdults, nbChildren, type } = req.body;
    const newFlightBooking = new reservation_model_1.default({
        userId,
        flightId,
        nbAdults,
        nbChildren,
        type,
        status: "en attente"
    });
    const existingReservation = yield reservation_model_1.default.findOne({ userId: userId, flightId: flightId });
    if (existingReservation) {
        res.status(400).json('L\'utilisateur a déjà réservé ce vol.');
    }
    else {
        newFlightBooking.save((err, savedFlightBooking) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du reservation.' });
            }
            res.status(201).json(savedFlightBooking);
        });
    }
}));
app.put('/setStatus/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookingId = req.params.id;
        const existingBooking = yield reservation_model_1.default.findById(bookingId).exec();
        if (!existingBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const { status } = req.body;
        const updatedBooking = yield reservation_model_1.default.findByIdAndUpdate(bookingId, { status: status }, { new: true });
        res.status(201).json({ message: 'booking status updated successfully', updatedBooking });
        const userId = updatedBooking.userId;
        const flightId = updatedBooking.flightId;
        if (status == "accepted") {
            socket.emit('notification', { userId, message: 'Your flight booking request number ' + flightId + ' is accepted.'
            });
        }
        else if (status == "refused") {
            socket.emit('notification', { userId, message: 'Your flight booking request number ' + flightId + ' is refused.'
            });
        }
        else if (status == "soldout") {
            socket.emit('notification', { userId, message: 'the flight number ' + flightId + ' is sold out.'
            });
        }
        else {
            socket.emit('notification', { userId, message: 'Your flight booking request number ' + flightId + ' is expired.'
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating Booking status' });
    }
}));
const server = app.listen(PORT, () => {
    console.log("flight-reseration-server on 3001");
});
const socket = require('socket.io')(server);
socket.on('connection', () => {
    console.log('Socket: client connected');
});
app.put('/refuse/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookingId = req.params.id;
        const existingBooking = yield reservation_model_1.default.findById(bookingId).exec();
        if (!existingBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const updatedBooking = yield reservation_model_1.default.findByIdAndUpdate(bookingId, { status: "refused" }, { new: true });
        res.status(201).json({ message: 'booking refused successfully', updatedBooking });
        const userId = updatedBooking.userId;
        const flightId = updatedBooking.flightId;
        socket.emit('notification', { userId, message: 'Your flight booking request number ' + flightId + ' is refused.'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error refusing Booking' });
    }
}));
app.delete('/cancelBooking/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flightReservation = yield reservation_model_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking deleted successfully', data: flightReservation });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting booking' });
    }
}));
app.put('/updateBooking', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flightReservation = yield reservation_model_1.default.findByIdAndUpdate(req.body._id, req.body, { new: true });
        res.json({ message: 'Booking updated successfully', data: flightReservation });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating Booking' });
    }
}));
app.get('/UserFlightBookings', keycloak.protect('realm:client'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.query.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.size) || 10;
    try {
        const flightReservation = yield reservation_model_1.default.paginate({ userId: id }, { page: page, limit: pageSize });
        res.send(flightReservation);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching flight Reservation', error: error });
    }
}));
app.get('/flightBookings', keycloak.protect('realm:admin'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.size) || 10;
    try {
        const flightReservation = yield reservation_model_1.default.paginate({ status: "en attente" }, { page: page, limit: pageSize });
        res.send(flightReservation);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching flight Reservation', error: error });
    }
}));
app.get('/flightBookings/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flightReservation = yield reservation_model_1.default.find({ _id: req.params.id }).exec();
        res.json(flightReservation);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching flight Reservation' });
    }
}));
app.post('/send-email', (req, res) => {
    try {
        const { flight, flightBooking, user } = req.body;
        const mailOptions = {
            from: 'teamflyware@gmail.com',
            to: [user.email],
            subject: "FlyWare Flight Reservation",
            html: `
          <h3 style="font-size: 17px;">Hi ${user.username},</h3>
          <p style="font-size: 14px;">Thank you for your booking. We're pleased to tell you that your reservation at FlyWare agency has been received and confirmed.</p>
      
          <h3 style="font-size: 17px;">Flight details</h3>
          <ul style="font-size: 14px;">
            <li>Flight number: ${flight._id.$oid}</li>
            <li>Departure: ${flight.departure}</li>
            <li>Departure date: ${new Date(flight.date).toISOString().split('T')[0]}</li>
            <li>Destination: ${flight.departure}</li>
            <li>Returning date: ${new Date(flight.returnDate).toISOString().split('T')[0]}</li> 
            <li>Price: ${flight.price}</li>          
         
            </ul>
      
          <h3 style="font-size: 17px;">Reservation details</h3>
          <ul style="font-size: 14px;">
            <li>Reservation number: ${flightBooking._id.$oid}</li>
            <li>Number of adults: ${flightBooking.nbAdults}</li>
            <li>Number of children: ${flightBooking.nbChildren}</li>
            <li>Class: ${flightBooking.type}</li>
          </ul>
      
          <p style="font-size: 14px;">Please contact us if you have any questions about your booking.</p>
          <p style="font-size: 14px;">We're looking forward to seeing you!</p>
      
          <p style="font-size: 14px;">FlyWare Team</p>
          <p style="font-size: 14px;">+216 55 666 777</p>
          <p style="font-size: 14px;">teamflyware@gmail.com</p>

        `
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                res.status(500).json({ message: 'Error sending email' });
            }
            else {
                console.log('Email sent:', info.response);
                res.json({ message: 'Email sent successfully' });
            }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get("/", (req, resp) => {
    resp.send("reservation service");
});

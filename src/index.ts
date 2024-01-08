import express, { Request, Response } from "express";
import mongoose from "mongoose";
import FlightReservation from "./reservation.model";
import bodyParser from "body-parser";

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
const app = express();
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
app.use(bodyParser.json());

const uri = "mongodb://127.0.0.1:27017/Flyware";
mongoose.connect(uri, (err) => {
  if (err) console.log(err);
  else console.log("Mongo Database connected successfully");
});

app.post('/reserver', keycloak.protect( 'realm:client' ), async (req:any, res:any) => {
  const {userId,flightId,nbAdults,nbChildren,type } = req.body;

  const newFlightBooking = new FlightReservation({
  userId,
  flightId,
  nbAdults,
  nbChildren,
  type,
  status: "en attente"
  });
  const existingReservation = await FlightReservation.findOne({ userId: userId, flightId: flightId });
  if (existingReservation) {
    res.status(400).json('L\'utilisateur a déjà réservé ce vol.');

  }else{
  newFlightBooking.save((err, savedFlightBooking) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: 'Une erreur est survenue lors de l\'enregistrement du reservation.' });
    }
    res.status(201).json(savedFlightBooking);
  });}
});


app.put('/setStatus/:id', async (req:any, res:any) => {
  try {
    const bookingId = req.params.id;
    
    const existingBooking = await FlightReservation.findById(bookingId).exec();

    if (!existingBooking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    const {status}=req.body
    const updatedBooking = await FlightReservation.findByIdAndUpdate(bookingId, {status:status}, { new: true });
    res.status(201).json({ message: 'booking status updated successfully',updatedBooking });
    const userId = (updatedBooking as { userId?: string }).userId;
    const flightId = (updatedBooking as { flightId?: string }).flightId;
    
    if(status=="accepted")
   { socket.emit('notification', {  userId,message:'Your flight booking request number '+flightId+' is accepted.'
  });}
  else if(status=="refused")
  { socket.emit('notification', {  userId,message:'Your flight booking request number '+flightId+' is refused.'
 });}
 else if(status=="soldout")
 { socket.emit('notification', {  userId,message:'the flight number '+flightId+' is sold out.'
});}
else
{ socket.emit('notification', {  userId,message:'Your flight booking request number '+flightId+' is expired.'
});}
  
} catch (error) {
    res.status(500).json({ message: 'Error updating Booking status' });
}
});



const server =app.listen(PORT, () => {
  console.log("flight-reseration-server on 3001");
});
const socket = require('socket.io')(server);

socket.on('connection', () => {
  console.log('Socket: client connected');
});

app.put('/refuse/:id', keycloak.protect( 'realm:admin' ), async (req:any, res:any) => {
  try {
    const bookingId = req.params.id;

    const existingBooking = await FlightReservation.findById(bookingId).exec();

    if (!existingBooking) {
        return res.status(404).json({ message: 'Booking not found' });
    }

    const updatedBooking = await FlightReservation.findByIdAndUpdate(bookingId, {status:"refused"}, { new: true });

    res.status(201).json({ message: 'booking refused successfully',updatedBooking });
    const userId = (updatedBooking as { userId?: string }).userId;
    const flightId = (updatedBooking as { flightId?: string }).flightId;
    socket.emit('notification', { userId,message:'Your flight booking request number '+flightId+' is refused.'
    } );


  
} catch (error) {
    res.status(500).json({ message: 'Error refusing Booking' });
}
});
app.delete('/cancelBooking/:id', keycloak.protect( 'realm:client' ), async (req:any, res:any) => {
  try {
    const flightReservation = await FlightReservation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted successfully', data: flightReservation });
} catch (error) {
    res.status(500).json({ message: 'Error deleting booking' });
}
});


app.delete('/deleteByFlightId/:id', async (req: any, res: any) => {
  try {

    const result = await FlightReservation.deleteMany({ flightId: req.params.id });

    res.json({ message: 'Bookings deleted successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting bookings' });
  }
});

app.put('/updateBooking', async (req:any, res:any) => {
  try {
    
    const flightReservation = await FlightReservation.findByIdAndUpdate(req.body._id, req.body, { new: true });
    res.json({ message: 'Booking updated successfully', data: flightReservation });
} catch (error) {
    res.status(500).json({ message: 'Error updating Booking'});
}
});


app.get('/UserFlightBookings', keycloak.protect('realm:client'), async (req, res) => {

  const id = req.query.id as string;

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.size as string) || 10;

  try {
    const flightReservation = await FlightReservation.paginate(
      { userId: id },
      { page: page, limit: pageSize }
    );

    res.send(flightReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching flight Reservation', error: error });
  }
});
app.get('/flightBookings', keycloak.protect('realm:admin'), async (req:any, res:any) => {
  
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.size as string) || 10;

  try {
    const flightReservation = await FlightReservation.paginate(
      { status:"en attente"},
      { page: page, limit: pageSize }
    );

    res.send(flightReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching flight Reservation', error: error });
  }});

app.get('/flightBookings/:id', async (req:any, res:any) => {
  try {
    const flightReservation = await FlightReservation.find({_id:req.params.id}).exec();
    res.json(flightReservation);
} catch (error) {
    res.status(500).json({ message: 'Error fetching flight Reservation' });
}
});


app.post('/send-email', (req:any, res:any) => {
  try {
      const { flight,flightBooking,user } = req.body;

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
      transporter.sendMail(mailOptions, (error:any, info:any) => {
          if (error) {
              console.log(error);
              res.status(500).json({ message: 'Error sending email' });
          } else {
              console.log('Email sent:', info.response);
              res.json({ message: 'Email sent successfully' });
          }
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get("/", (req, resp) => {
  resp.send("reservation service");
});

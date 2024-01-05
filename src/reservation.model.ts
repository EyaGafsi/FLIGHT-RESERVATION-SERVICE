import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate";

interface FlightReservationModel extends Document {
  userId: string;
  flightId: string;
  nbAdults: number;
  nbChildren: number;
  type: string;
  status: string;
}

let flightReservationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  flightId:{type: String,required: true},
  nbAdults:{ type: Number, required: true },
  nbChildren:{ type: Number, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
});

flightReservationSchema.plugin(mongoosePaginate);


const FlightReservation  = mongoose.model("flightReservation", flightReservationSchema);

export default FlightReservation;

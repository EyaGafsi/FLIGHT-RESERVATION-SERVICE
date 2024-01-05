"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_paginate_1 = __importDefault(require("mongoose-paginate"));
let flightReservationSchema = new mongoose_1.default.Schema({
    userId: { type: String, required: true },
    flightId: { type: String, required: true },
    nbAdults: { type: Number, required: true },
    nbChildren: { type: Number, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
});
flightReservationSchema.plugin(mongoose_paginate_1.default);
const FlightReservation = mongoose_1.default.model("flightReservation", flightReservationSchema);
exports.default = FlightReservation;

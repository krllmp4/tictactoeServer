const mongoose = require("mongoose");
const playerSchema = require("./player");

function generateRoomCode() {
  const min = 1000; // Minimum value of the room code
  const max = 9999; // Maximum value of the room code

  const roomCode = Math.floor(Math.random() * (max - min + 1)) + min;

  return roomCode.toString();
}

const roomSchema = new mongoose.Schema({
  occupancy: {
    type: Number,
    default: 2,
  },
  maxRounds: {
    type: Number,
    default: 5,
  },
  currentRound: {
    required: true,
    type: Number,
    default: 1,
  },
  players: [playerSchema],
  isJoin: {
    type: Boolean,
    default: true,
  },
  turn: playerSchema,
  turnIndex: {
    type: Number,
    default: 0,
  },
});

roomSchema.pre("save", async function (next) {
  const roomID = generateRoomCode();
  const exists = await this.constructor.exists({ roomID });

  if (exists) {
    return this.save(next); // Use this.save() instead of this.pre("save", next)
  }
  
  this.roomID = roomID;
  next();
});

const roomModel = mongoose.model("Room", roomSchema);
module.exports = roomModel;

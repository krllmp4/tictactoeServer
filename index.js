// Импорт модулей
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");

const app = express();
const port = parseInt(process.env.PORT,10) || 3000;
var server = http.createServer(app);
const Room = require("./models/room");
const { log } = require("console");
var io = require("socket.io")(server);

// Middleware
app.use(express.json());

const DB = "mongodb+srv://krll:kir010404@krllcluster.knfsx5v.mongodb.net/?retryWrites=true&w=majority";
io.on("connection", (socket) => {
  console.log("connected!");
  socket.on("createRoom", async ({ nickname }) => {
    try {
      console.log('nickname is '+nickname);
      // Создание комнаты
      let room = new Room();
      let player = {
        socketID: socket.id,
        nickname,
        playerType: "X",
      };
      room.players.push(player);
      room.turn = player;
      room = await room.save();
      console.log(room);
      const roomId = room._id.toString();
      //const roomId = generateRoomCode();

      socket.join(roomId);
      io.to(roomId).emit("createRoomSuccess", room);
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("joinRoom", async ({ nickname, roomId }) => {
    try {
      if (!(roomId >= 1000 && roomId <= 9999)) {
        socket.emit("errorOccurred", "Please enter a valid room ID.");
        return;
      }
      let room = await Room.findById(roomId);

      if (room.isJoin) {
        let player = {
          nickname,
          socketID: socket.id,
          playerType: "O",
        };
        socket.join(roomId);
        room.players.push(player);
        room.isJoin = false;
        room = await room.save();
        io.to(roomId).emit("joinRoomSuccess", room);
        io.to(roomId).emit("updatePlayers", room.players);
        io.to(roomId).emit("updateRoom", room);
      } else {
        socket.emit(
          "errorOccurred",
          "The game is in progress, try again later."
        );
      }
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("tap", async ({ index, roomId }) => {
    try {
      let room = await Room.findById(roomId);
      
      console.log('tapped');

      let choice = room.turn.playerType; // X or O
      if (room.turnIndex == 0) {
        room.turn = room.players[1];
        room.turnIndex = 1;
      } else {
        room.turn = room.players[0];
        room.turnIndex = 0;
      }
      room = await room.save();
      io.to(roomId).emit("tapped", {
        index,
        choice,
        room,
      });
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("winner", async ({ winnerSocketId, roomId }) => {
    try {
      if (socket.id != winnerSocketId) {
        return;
      }
      let room = await Room.findById(roomId);
      let player = room.players.find(
        (playerr) => playerr.socketID == winnerSocketId
      );
      player.points += 1;
      room = await room.save();

      if (player.points >= room.maxRounds) {
        io.to(roomId).emit("endGame", player);
      } else {
        io.to(roomId).emit("pointIncrease", player);
      }
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("revenge", async ({ roomId }) => {
    try {
      console.log('revenge');
      let room = await Room.findById(roomId);
      console.log('roomID is '+ roomId);
      room.currentRound = 1;

        console.log(room.players[0].points);
        console.log(room.players[1].points);

      room.players[0].points=0;
      room.players[1].points=0;

        console.log(room.players[0].points);
        console.log(room.players[1].points);
      
      room = await room.save();
      io.to(roomId).emit("revenged", room);

        console.log('player revenge');

        console.log(room.players[0].nickname);
        console.log(room.players[1].nickname);

      io.to(roomId).emit("pointsClear1", room.players[0]);
      io.to(roomId).emit("pointsClear2", room.players[1]);

        console.log('pointsclear');
    } catch (e) {
      console.log(e);
    }
  });

  socket.on("exitGame", async ({ roomId }) => {
    try {
      console.log('exit');
      let room = await Room.findById(roomId);
      await Room.deleteOne({ _id: roomId });
      socket.leave(roomId);
      console.log(room);
      io.to(roomId).emit("clearGameData", room);
    } catch (e) {
      console.log(e);
    }
  });
});

mongoose.set("strictQuery", true);
mongoose
  .connect(DB)
  .then(() => {
    console.log("Connection successful!");
  })
  .catch((e) => {
    console.log(e);
  });

server.listen(port, () => {
  console.log(`Server started and running on port ${port}`);
});

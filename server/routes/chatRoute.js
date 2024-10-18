const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getRoom,
  getChats,
  createRoom,
  getRooms,
  uploadImage,
  getRoomCsr,
} = require("../controllers/chatController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const filename = req.body.filename;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

router.use("/uploads", express.static("uploads"));

router.get("/fetchRoom/:id", getRoom);
router.get("/fetchRoomCsr/:id", getRoomCsr);
router.post("/createRoom", createRoom);
router.post("/uploadImage", upload.single("chat"), uploadImage);
router.get("/chats/:id", getChats);
router.get("/fetchRooms", getRooms);

module.exports = router;

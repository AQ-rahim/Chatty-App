const pool = require("../database");

const getRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const existingRoom = await pool.query(
      "SELECT * FROM chat_room WHERE room_id = $1;",
      [id]
    );

    if (existingRoom.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Room Found",
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Chat room already exists",
        id: existingRoom.rows[0].id,
        roomId: existingRoom.rows[0].room_id,
      });
    }
  } catch (error) {
    console.error("Error fetching chat room:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getRoomCsr = async (req, res) => {
  const { id } = req.params;
  try {
    const existingRoom = await pool.query(
      "SELECT * FROM chat_room WHERE csr = $1 AND status = 0;",
      [id]
    );
    console.log(existingRoom.rows[0]);

    if (existingRoom.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Support ticket is assigned now",
      });
    } else {
      const getUser = await pool.query(
        "SELECT username, email FROM users WHERE user_id = $1",
        [existingRoom.rows[0].user]
      );
      console.log(getUser.rows[0]);
      return res.status(200).json({
        success: true,
        message: "You have a new support ticket",
        username: getUser.rows[0].username,
        email: getUser.rows[0].email,
        id: existingRoom.rows[0].id,
        roomId: existingRoom.rows[0].room_id,
      });
    }
  } catch (error) {
    console.error("Error creating or fetching chat room:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createRoom = async (req, res) => {
  const { id } = req.body;

  try {
    const getCsr = await pool.query(
      "SELECT * FROM admin WHERE available = true AND role = $1",
      ["csr"]
    );

    if (getCsr.rowCount === 0) {
      return res.status(404).json({
        success: true,
        message: "All CSR are busy at the moment",
      });
    }

    const newRoom = await pool.query(
      'INSERT INTO chat_room (room_id, status, date, "user", csr) VALUES ($1, 0, CURRENT_DATE, $2, $3) RETURNING *',
      [id, id, getCsr.rows[0].id]
    );

    console.log("New Room Created:", newRoom.rows[0]);

    return res.status(201).json({ success: true, room: newRoom.rows[0] });
  } catch (error) {
    console.log("Error:", error);

    return res.status(500).json({ error: "Failed to create chat room" });
  }
};

const getChat = async (req, res) => {
  const { id } = req.params;
  try {
    const chats = await pool.query(
      "SELECT message, time, sender FROM chats WHERE chat_room_id = $1",
      [id]
    );

    if (chats.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No chat found!",
      });
    } else {
      return res.status(200).json({
        success: true,
        chats: chats.rows,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// For Admin Panel
const getRooms = async (req, res) => {
  try {
    const rooms = await pool.query(
      "WITH RankedChats AS (SELECT chat_room.room_id, chat_room.user, to_char(chats.time, 'HH12:MI am') AS time,chats.message, chats.chat_room_id,ROW_NUMBER() OVER (PARTITION BY chat_room_id ORDER BY chats.time DESC) AS rank FROM chats INNER JOIN chat_room ON chats.chat_room_id = chat_room.id) SELECT room_id, user, time, message, chat_room_id FROM RankedChats WHERE rank = 1;"
    );
    if (rooms.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No Room found!",
      });
    } else {
      //   console.log(rooms.rows);
      return res.status(200).json({
        success: true,
        rooms: rooms.rows,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

const getChats = async (req, res) => {
  const { id } = req.params;
  try {
    const chats = await pool.query(
      "SELECT message, time, sender FROM chats WHERE chat_room_id = $1",
      [id]
    );

    if (chats.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No chat found!",
      });
    } else {
      return res.status(200).json({
        success: true,
        chats: chats.rows,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const uploadImage = async (req, res) => {
  const image = req.file;

  if (image.filename) {
    return res.status(200).json({
      success: true,
    });
  }
};

module.exports = {
  createRoom,
  getChat,
  getRoom,
  getRooms,
  getChats,
  uploadImage,
  getRoomCsr,
};

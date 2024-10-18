import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Platform,
  Image,
} from "react-native";
import EmojiSelector, { Categories } from "react-native-emoji-selector";
import io from "socket.io-client";
import moment from "moment";
import * as ImagePicker from "expo-image-picker";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { chat_url } from "./url";
import { AppContext } from "@/context/appContext";
import Header from "@/components/header";
import { Colors, Fonts, Sizes } from "@/constants/styles";

let socket: any;

const ChatScreen = () => {
  const { data } = useContext(AppContext);

  const [room, setRoom] = useState(null);
  const [chats, setChats] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log("Connecting to socket server at:");
    socket = io("http://192.168.1.111:5000", {
      path: "/support/socket.io",
      autoConnect: true,
      transports: ["websocket"],
    });
    // socket = io("https://server.only-halal.com", {
    //   path: "/support/socket.io",
    //   autoConnect: true,
    //   transports: ["websocket"],
    // });

    socket.on("connect", () => {
      console.log("Connected to Chat Server", socket.id);
      fetchRoomAndChats();
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Chat Server");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection Error:", err);
    });

    socket.on("reconnect_error", (err) => {
      console.error("Reconnection Error:", err);
    });

    socket.on("receive_message", (data) => {
      console.log("Message received:", data);
      setChats((prevChats) => [...prevChats, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchRoomAndChats = async () => {
    try {
      const roomResponse = await fetch(
        `${chat_url}/fetchRoom/${data.user.user_id}`
      );
      const roomJson = await roomResponse.json();

      if (roomJson.success === true) {
        console.log("Room found:", roomJson.roomId);
        setRoom(roomJson.roomId);
        socket.emit("join_room", roomJson.roomId);
        console.log("Room Joined:", roomJson.roomId);

        const chatsResponse = await fetch(`${chat_url}/chats/${roomJson.id}`);
        const chatsJson = await chatsResponse.json();

        if (chatsJson.success === true) {
          setChats(chatsJson.chats);
        }
      }
    } catch (error) {
      console.error("Error fetching room and chats:", error);
    }
  };

  const imageLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry! Media library access denied");
    } else {
      const response = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
      });
      if (!response.canceled) {
        const fileExtension = response.assets[0].uri.split(".").pop();
        const filename = `chat-${Date.now()}.${fileExtension}`;

        const formData = new FormData();
        formData.append("filename", filename);
        formData.append("chat", {
          uri: response.assets[0].uri,
          name: filename,
          type: `image/${fileExtension}`,
        } as any);

        const uploadResponse = await fetch(`${chat_url}/uploadImage`, {
          method: "POST",
          body: formData,
        });

        const responseData = await uploadResponse.json();
        if (responseData.success === true) {
          const messageData = {
            room: room,
            author: data.user.username,
            message: filename,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          };

          await socket.emit("upload_image", messageData);
        }
      }
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() !== "") {
      const messageData = {
        room: room,
        author: data.user.username,
        message: newMessage.trim(),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };
      console.log("Sending message:", messageData);

      socket.emit("send_message", messageData, (ack) => {
        if (ack?.error) {
          console.error("Message not sent:", ack.error);
        } else {
          console.log("Message sent successfully");
        }
      });

      setNewMessage("");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prevMessage) => (prevMessage || "") + emoji);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prevShowEmojiPicker) => !prevShowEmojiPicker);
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [chats]);

  return (
    <View style={styles.container}>
      <Header name="Support" />
      <FlatList
        ref={flatListRef}
        data={chats}
        renderItem={({ item, index }) => (
          <Animated.View
            style={[
              styles.messageBubble,
              {
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
                backgroundColor:
                  item.sender === data.user.username
                    ? Colors.secondaryColor
                    : "#bbbbbb",
                alignSelf:
                  item.sender === data.user.username
                    ? "flex-end"
                    : "flex-start",
              },
            ]}
          >
            {item.message.includes(".png") ||
            item.message.includes(".jpg") ||
            item.message.includes(".jpeg") ? (
              <Image
                source={{ uri: `${chat_url}/uploads/${item.message}` }}
                style={styles.image}
              />
            ) : (
              <Text style={styles.messageText}>{item.message}</Text>
            )}
            <Text
              style={[
                styles.time,
                {
                  textAlign:
                    item.sender === data.user.username ? "right" : "left",
                },
              ]}
            >
              {moment(`1970-01-01 ${item.time}`).format("hh:mm A")}
            </Text>
          </Animated.View>
        )}
        keyExtractor={(item, index) => `chat_${item.id || index}`}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={toggleEmojiPicker}
        >
          <MaterialIcons name="emoji-emotions" style={styles.sendButtonText} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={(text) => setNewMessage(text)}
          placeholder="Type your message..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.attachment} onPress={imageLibrary}>
          <MaterialCommunityIcons
            name="attachment"
            size={24}
            color={Colors.primaryColor}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" style={styles.sendButtonText} />
        </TouchableOpacity>
      </View>
      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <EmojiSelector
            category={Categories.symbols}
            onEmojiSelected={handleEmojiSelect}
            columns={8}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: Platform.OS === "ios" ? 100 : 50,
    paddingHorizontal: 5,
    backgroundColor: Colors.primaryColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: Sizes.title,
    color: "#fff",
    textAlign: "center",
    marginTop: Platform.OS === "ios" ? 30 : 0,
    fontFamily: Fonts.Regular,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 10,
  },
  messageBubble: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 2,
    maxWidth: "70%",
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: -20,
    alignSelf: "flex-end",
  },
  messageText: {
    color: "#fff",
    fontSize: Sizes.text,
    fontFamily: Fonts.Regular,
  },
  image: {
    width: 200,
    height: 200,
  },
  time: {
    color: Colors.whiteColor,
    marginVertical: 5,
    fontSize: Sizes.smallText,
    fontFamily: Fonts.Regular,
  },
  inputContainer: {
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    // paddingBottom: Platform.OS === "ios" ? 30 : 10,
    backgroundColor: "#fff",
    shadowColor: Colors.titleColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
    position: "relative",
  },
  attachment: {
    position: "absolute",
    right: "17%",
    top: "35%",
  },
  emojiButton: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingVertical: Platform.OS === "ios" ? 17 : 12,
    paddingHorizontal: 15,
  },
  sendButton: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: Platform.OS === "ios" ? 17 : 12,
    paddingHorizontal: 20,
  },
  sendButtonText: {
    color: Colors.primaryColor,
    fontSize: Sizes.subtitle,
    fontFamily: Fonts.Regular,
  },
  emojiPickerContainer: {
    width: "100%",
    height: 400,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 40 : 10,
    marginBottom: 20,
  },
});

export default ChatScreen;

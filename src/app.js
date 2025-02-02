// mainly for express

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();
// everything is configured after app creation
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
// from data configure in JSON format
app.use(express.json({ limit: "16kb" }));
// handle data from URL
app.use(express.urlencoded({ extended: true }));
// in order to access assets from public folder that we want to share with everyone
app.use(express.static("public"));
//handle or perfom CRUD on user's cookies in a secure way
app.use(cookieParser());

// IMPORT ROUTES
import userRouter from "./routes/user.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
//ROUTES DECLARATION
app.use("/api/v1/users", userRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);

export { app };

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/video-like-toggle/v/:videoId").post(toggleVideoLike);
router.route("/comment-like-toggle/c/:commentId").post(toggleCommentLike);
router.route("/tweet-like-toggle/t/:tweetId").post(toggleTweetLike);
router.route("/get-liked-videos").get(getLikedVideos);

export default router;

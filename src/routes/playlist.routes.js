import { Router } from "express";
//controller imports
import {
  addVideoToPlaylist,
  createPlaylist,
  getPlaylistById,
  getUserPlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/create-playlist").post(verifyJWT, createPlaylist);
router.route("/user-playlist").get(verifyJWT, getUserPlaylist);
router.route("/id/:id").get(getPlaylistById);
router
  .route("/add-video/v/:videoId/p/:playlistId")
  .post(verifyJWT, addVideoToPlaylist);
export default router;

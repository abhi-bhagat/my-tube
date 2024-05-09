import { Router } from "express";
//controller imports
import {
  addVideoToPlaylist,
  createPlaylist,
  getPlaylistById,
  getUserPlaylist,
  removeVideoFromPlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/create-playlist").post(verifyJWT, createPlaylist);
router.route("/user-playlist").get(verifyJWT, getUserPlaylist);
router.route("/id/:id").get(getPlaylistById);
router
  .route("/add-video/v/:videoId/p/:playlistId")
  .post(verifyJWT, addVideoToPlaylist);
router
  .route("/remove-video/p/:playlistId/v/:videoId")
  .delete(verifyJWT, removeVideoFromPlaylist);
export default router;

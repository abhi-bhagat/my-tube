import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishVideo,
  updateVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";

const router = Router();

router.route("/").get(verifyJWT, getAllVideos);
router.route("/v/:videoId").get(verifyJWT, getVideoById);
router
  .route("/add-video")
  .post(verifyJWT, upload.single("videoFile"), publishVideo);
router.route("/update-video/v/:videoId").patch(verifyJWT, updateVideo);
router.route("/delete-video/v/:id").delete(verifyJWT, deleteVideo);
router
  .route("/toggle-publish-status/v/:videoId")
  .post(verifyJWT, togglePublishStatus);
export default router;

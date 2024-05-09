import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComment,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/add-comment/v/:videoId").post(verifyJWT, addComment);
router.route("/get-comments/v/:videoId").get(verifyJWT, getVideoComment);
router.route("/update-comment/c/:commentId").patch(verifyJWT, updateComment);
router.route("/delete-comment/c/commentId").delete(verifyJWT, deleteComment);
export default router;

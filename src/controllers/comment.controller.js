import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import mongoose from "mongoose";
//add comment
const addComment = asyncHandler(async (req, res) => {
  // add content ,video and owner
  const { id } = req.user;
  const { videoId } = req.params;
  const { content } = req.body;
  if (!id) {
    throw new ApiError(400, " User is not logged in");
  }
  if (!videoId) {
    throw new ApiError(400, " video id wasn't found");
  }
  if (!content) {
    throw new ApiError(404, " can't post without comment");
  }
  const comment = await Comment.create({
    content,
    owner: id,
    video: videoId,
  });
  if (!comment) {
    throw new ApiError(500, "error saving comment");
  }
  res
    .status(200)
    .json(new ApiResponse(201, comment, "comment posted successfully"));
});
// get video comments
const getVideoComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const tempId = new mongoose.Types.ObjectId(videoId);
  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  const foundComment = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetail",
        pipeline: [
          {
            $project: {
              title: true,
              descripton: 1,
              thumbnail: 1,
              videoFile: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetail",
        pipeline: [
          {
            $project: {
              userName: 1,
              fullName: 1,
              email: 1,
            },
          },
        ],
      },
    },
  ]);
  if (!foundComment) {
    throw new ApiError(400, "comment was not found");
  }
  res.status(200).json(new ApiResponse(201, foundComment, "comment retrived"));
});
//update comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!commentId) {
    throw new ApiError(400, " comment id was not provided");
  }
  if (!content) {
    throw new ApiError(400, " comment can't be empty");
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId, {
    $set: { content },
  });
  if (!updatedComment) {
    throw new ApiError(500, "error updating comment");
  }
  res
    .status(200)
    .json(new ApiResponse(400, updateComment, "comment updated successfully"));
});
// delete comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError(400, " comment id was not provided");
  }
  const delResponse = await Comment.findByIdAndDelete(commentId);
  if (!delResponse) {
    throw new ApiError(500, "error deleting comment");
  }

  res
    .status(200)
    .json(new ApiResponse(201, {}, "Comment deleted succeddfully"));
});

export { getVideoComment, addComment, updateComment, deleteComment };

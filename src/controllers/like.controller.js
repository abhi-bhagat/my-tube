import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import mongoose, { MongooseError } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { id } = req.user;
  if (!videoId) {
    throw new ApiError(400, "Video id wasn't provided");
  }

  const foundVideo = await Like.find({
    video: new mongoose.Types.ObjectId(videoId),
  });
  if (foundVideo.length) {
    const unlikedVideo = await Like.findByIdAndDelete(foundVideo[0]._id);

    res.status(200).json(new ApiResponse(201, {}, "Video Was unliked"));
  } else {
    const likedVideo = await Like.create({ video: videoId, likedBy: id });
    res.status(200).json(new ApiResponse(201, {}, "Video Was liked"));
  }
});

// toggle comment like
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { id } = req.user;
  if (!commentId) {
    throw new ApiError(400, "comment id is required");
  }
  if (!id) {
    throw new ApiError(404, "User not found");
  }
  const foundLikedComment = await Like.find({
    comment: new mongoose.Types.ObjectId(commentId),
  });
  if (foundLikedComment.length) {
    await Like.findByIdAndDelete(foundLikedComment[0]._id);
    res
      .status(200)
      .json(new ApiResponse(201, {}, "Comment successfully unliked"));
  } else {
    const createdCommentLike = await Like.create({
      comment: commentId,
      likedBy: id,
    });
    res
      .status(200)
      .json(
        new ApiResponse(201, createdCommentLike, "comment liked successfully")
      );
  }
});

//toggle tweet like
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { id } = req.user;
  if (!tweetId) {
    throw new ApiError(400, "Tweet id not found");
  }

  const foundTweet = await Like.find({
    tweet: new mongoose.Types.ObjectId(tweetId),
  });
  if (foundTweet.length) {
    await Like.findByIdAndDelete(foundTweet[0]._id);
    res
      .status(200)
      .json(new ApiResponse(201, {}, "tweet successfully unliked"));
  } else {
    const likedTweet = await Like.create({ tweet: tweetId, likedBy: id });
    res
      .status(200)
      .json(new ApiResponse(201, likedTweet, "tweet successfully liked"));
  }
});

// get liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
  const { id } = req.user;

  const likedVideos = await Like.find({
    likedBy: new mongoose.Types.ObjectId(id),
    video: { $exists: true },
  });

  if (!likedVideos) {
    throw new ApiError(400, "No videos were liked by user");
  }

  res
    .status(200)
    .json(
      new ApiResponse(201, likedVideos, "Liked videos successfully fetched")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };

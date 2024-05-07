import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//create tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { id } = req.user;
  if (!content) {
    throw new ApiError(400, "please provide content for tweet");
  }

  const tweet = await Tweet.create({
    owner: id,
    content,
  });

  res
    .status(200)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

// get user tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const processedId = new mongoose.Types.ObjectId(id);
  const userTweets = await Tweet.find({ owner: { $eq: processedId } }).populate(
    "owner",
    "fullName avatar userName"
  );
  if (!userTweets) {
    throw new ApiError(400, "No tweets from this user");
  }
  res
    .status(200)
    .json(new ApiResponse(201, userTweets, "Tweets fetched successfully"));
});

// update tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new ApiError(400, "tweet id was not sent");
  }
  if (!content) {
    throw new ApiError(400, "content can't be empty to update");
  }
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!updateTweet) {
    throw new ApiError(500, "error updating tweet");
  }

  res
    .status(200)
    .json(new ApiResponse(201, updatedTweet, "tweet updated successfully"));
});

//delete tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "provide tweet id");
  }

  await Tweet.findByIdAndDelete(tweetId);

  res.status(200).json(new ApiResponse(201, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

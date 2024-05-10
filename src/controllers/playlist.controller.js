import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

//* create playlist
const createPlaylist = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const { id } = req.user;
  if (!name || !description) {
    throw new ApiError(400, "please provide all fields");
  } else {
  }
  const foundPlaylist = await Playlist.findOne({ name });
  if (foundPlaylist) {
    throw new ApiError(400, "Playlist already exists");
  }
  //create playlist make sure to add userId there so we can use POPULATE to fetch the data while getting user Playlist
  const createdPlaylist = await Playlist.create({
    name: name,
    description: description,
    owner: id,
  });
  const checkCreatedPlaylist = await Playlist.findById(
    createdPlaylist._id
  ).populate("owner", "userName fullName avatar");

  if (!checkCreatedPlaylist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }
  res
    .status(200)
    .json(
      new ApiResponse(201, createdPlaylist, "Playlist created successfully")
    );
});

//*  get user playlist
const getUserPlaylist = asyncHandler(async (req, res, next) => {
  const { id } = req.user._id;

  if (!id) {
    throw new ApiError(400, "Please login first");
  }
  const convertedId = new mongoose.Types.ObjectId(id);

  //STEP :  add POPULATE method
  //! Important thing to note. read explanation carefully
  //exp: here remember that we saved our owner field as ObjectId which is a BSON object id. but the id that we are getting from the user is a string. so if we are not using mongoose's findById then we need to convert it to ObjectId. so that we can easily compare that with the stored owner field.

  //exp2: REMEMBER: we have to use $eq operator so that mongoose can compare for equality. We are tyring to check
  //exp: IF THE GIVEN OWNER ID IS EQUAL TO THE OWNER ID STORED IN THE PLAYLIST "OWNER" DOCUMENT
  // as we have already added userId while creating playlist, we can easily use populate to fetch the data and add desired fields
  const playlist = await Playlist.find({
    owner: { $eq: convertedId },
  }).populate("owner", "userName fullName avatar email");
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  res
    .status(200)
    .json(new ApiResponse(201, playlist, "Playlist fetched seccessfully"));
});

//* add video to playlist
//todo: make sure to check that same video is not added twice in the playlist
const addVideoToPlaylist = asyncHandler(async (req, res, next) => {
  const { videoId, playlistId } = req.params;
  if (!videoId.trim || !playlistId.trim) {
    throw new ApiError(400, "Video or playlist id missing");
  }
  // following is correct code but will not generate any error messages
  //? const foundPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
  // ?  $addToSet: { videos: new mongoose.Types.ObjectId(videoId) },
  // ?});

  const foundPlaylist = await Playlist.findById(playlistId);
  if (!foundPlaylist) {
    throw new ApiError(400, "playlist not found");
  }

  const videoExists = foundPlaylist.videos.includes(
    new mongoose.Types.ObjectId(videoId)
  );
  if (videoExists) {
    throw new ApiError(409, "Video is already in the playlist");
  }
  const videoSaved = foundPlaylist.videos.push(processedVideoId);

  if (!videoSaved) {
    throw new ApiError(
      500,
      "Something went wrong while adding video to playlist"
    );
  }
  await foundPlaylist.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(new ApiResponse(201, foundPlaylist, "Video added successfully"));
});

//*  get playlist by id
//STEP:     GENERAL FETCH
// this will be a general fetch, where we are getting playlist with the playlist id, user doesn't have to login and anyone with this link/id can see the playlist.
const getPlaylistById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id?.trim) {
    throw new ApiError(400, "Please provide playlist id");
  }
  const playlist = await Playlist.findById(id).populate("videos");
  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  res
    .status(200)
    .json(new ApiResponse(201, playlist, "Playlist fetched seccessfully"));
});

//*  remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res, next) => {
  const { videoId, playlistId } = req.params;

  // find playlist from playlist collection
  // find video from that playlist using id
  // remove (update, patch)that video
  if (!videoId || !playlistId) {
    throw new ApiError(400, "Please provide required fields");
  }

  const foundPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId },
    },
    { new: true }
  );
  if (!foundPlaylist) {
    throw new ApiError(500, "Error deleting video from playlist");
  }

  res
    .status(200)
    .json(new ApiResponse(201, foundPlaylist, "Video Removed successfully"));
});

//*  DELETE PLAYLIST
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist doesn't exist");
  }

  try {
    await Playlist.findByIdAndDelete(playlistId);
  } catch (error) {
    res.status(500, `Error deleting playlist ${error}`);
  }

  res
    .status(200)
    .json(new ApiResponse(201, {}, "Playlist deleted successfully"));
});

//* UPDATE PLAYLIST
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!playlistId) {
    throw new ApiError(400, "playlist id was not found");
  }
  if (!name && !description) {
    throw new ApiError(400, "name and description can't be empty");
  }
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: { name, description },
    },
    { new: true }
  );
  if (!updatedPlaylist) {
    throw new ApiError(500, "Error updating the playlist");
  }

  res
    .status(200)
    .json(
      new ApiResponse(201, updatePlaylist, "playlist updated successfully")
    );
});
export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};

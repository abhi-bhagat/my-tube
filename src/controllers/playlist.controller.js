import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "please provide all fields");
  } else {

  }
  const foundPlaylist = await Playlist.findOne({ name });
  if (foundPlaylist) {
    throw new ApiError(400, "Playlist already exists");
  }
  const createdPlaylist = await Playlist.create({
    name: name,
    description: description,
  });
  const checkPlaylistCreated = await Playlist.findById(createdPlaylist._id);
  if (!checkPlaylistCreated) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }
  res
    .status(200)
    .json(
      new ApiResponse(201, createdPlaylist, "Playlist created successfully")
    );
});

export { createPlaylist };

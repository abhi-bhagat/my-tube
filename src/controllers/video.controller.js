import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadCloudinary } from "../utils/cloudinary.service.js";
//get Videos
// TODO: get all videos based on query, sort, pagination
//TODO: check and show videos based on publish status
const getAllVideos = asyncHandler(async (req, res, next) => {
  //* const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
  const videos = await Video.find().populate(
    "owner",
    "userName fullName avatar"
  );
  res
    .status(200)
    .json(new ApiResponse(201, videos, "Videos fetched successfully"));
});

//get Video By Id
const getVideoById = asyncHandler(async (req, res, next) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Please provide video Id");
  }

  const foundVideo = await Video.findById(videoId).populate(
    "owner",
    "userName fullName avatar"
  );
  if (!foundVideo) {
    throw new ApiError(400, "No video with that id");
  }
  res
    .status(200)
    .json(new ApiResponse(201, foundVideo, "Video found successfully"));
});

//publish a video
const publishVideo = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  const { id } = req.user;
  if (!id) {
    throw new ApiError(400, "Please login to upload");
  }
  if (!title || !description) {
    throw new ApiError(400, "Please provide title and description");
  }

  // get video link, thumbnail link and duration
  const localVideoPath = req.file.path;
  //   const localThumbnailPath = req.files?.thumbnail[0]?.path;
  if (!localVideoPath) {
    throw new ApiError(400, "Upload video");
  }

  // upload these on cloudinary
  const uploadedVideo = await uploadCloudinary(localVideoPath);
  //   const uploadedThumbnail = await uploadCloudinary(localThumbnailPath);
  if (!uploadedVideo) {
    throw new ApiError(500, " Error uploading file to cloudinary");
  }

  // if everything good. create video
  const video = await Video.create({
    title,
    description,
    videoFile: uploadedVideo.url,
    thumbnail: `${uploadedVideo.url}.jpg`,
    duration: uploadedVideo.duration,
    owner: id,
  });

  res
    .status(200)
    .json(new ApiResponse(201, video, "Video uploaded successfully"));
});

//update video
const updateVideo = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  if (!title && !description) {
    throw new ApiError(400, "Please provide title and/or description");
  }
  if (!videoId) {
    throw new ApiError("Provide a video id");
  }
  let updatedVideoDetails;
  if (title && description) {
    updatedVideoDetails = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: { title, description },
      },
      { new: true }
    );
  } else if (title) {
    updatedVideoDetails = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: { title },
      },
      { new: true }
    );
  } else {
    updatedVideoDetails = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: { description },
      },
      { new: true }
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        201,
        updatedVideoDetails,
        "Video details updated successfully"
      )
    );
});

//delete video
const deleteVideo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(400, "Please provide an id");
  }
  const deletedVideo = await Video.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

//toggle publish
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Provide video id");
  }
  const foundVideo = await Video.findById(videoId);
  if (!foundVideo) {
    throw new ApiError(404, "Video wasn't found");
  }
  foundVideo.isPublished = !foundVideo.isPublished;

  console.log("🚀 ---------------------------------------------------------------------------------------------------------🚀")
  console.log("🚀 ~ file: video.controller.js:149 ~ togglePublishStatus ~ foundVideo.isPublished:", foundVideo.isPublished)
  console.log("🚀 ---------------------------------------------------------------------------------------------------------🚀")

  const newVideoStatus = foundVideo.save({ validateBeforeSave: false });
  res
    .status(200)
    .json(
      new ApiResponse(
        201,
        {},
        `toggle status of video set to ${foundVideo.isPublished}`
      )
    );
});
export {
  getAllVideos,
  getVideoById,
  publishVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

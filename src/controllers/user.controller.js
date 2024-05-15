import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.service.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import CircularJSON from "circular-json";
const generateTokens = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, userName, password } = req.body;

  if (
    [fullName, email, userName, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "Please fill all fields");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } else {
    coverImageLocalPath = "";
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file location is required");
  }

  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName: fullName,
    email: email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    userName: userName.toLowerCase(),
    password: password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { userName, password, email } = req.body;

  if (!userName && !email) {
    throw new ApiError(400, "Please provide username and email");
  }
  const foundUser = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!foundUser) {
    throw new ApiError(404, "User not found");
  }
  const passwordValid = await foundUser.isPasswordCorrect(password);
  if (!passwordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    foundUser._id
  );
  const updatedFoundUser = await User.findById(foundUser._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: updatedFoundUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  
  const foundUser = req.user._id;

  // remove user's refreshToken from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  // remove cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  //EXP : In a situation where the access token is expired, we will check user's refresh token and then see it it is valid or not. If it is valid then we will generate new access token and send it to the user. If it is not valid then we will throw an error.

  //STEP : get refreshToken from user(via cookies)

  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  //STEP: verify incomingRefreshToken

  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //STEP: find user if the access token is found
    const foundUser = await User.findById(decodedRefreshToken?._id);

    if (!foundUser) {
      throw new ApiError(401, "Invalid refresh token");
    }

    //NOTE: we used incomingRefreshToken and not decoded token as incoming refresh token in the one that is saved in the DB of our user and that has all the info like : user id.
    //NOTE: we used decodedToken to get the userId from the token so that we can find the user from DB and then compare.

    //STEP: match incomingRefresh token with the backend
    if (incomingRefreshToken !== foundUser?.refreshToken) {
      throw new ApiError(401, "Expired/Invalid refresh token");
    }

    //STEP: save new refresh and access tokens in the cookies and give to user
    // generate options
    const options = {
      httpOnly: true,
      secure: true,
    };
    // generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      foundUser._id
    );
    //STEP :  now return the response to the user
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          201,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Problem decoding refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ valildateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(201, {}, "Password has been changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res
    .status(200)
    .json(new ApiResponse(201, req.user, "User fetched successfully"));
});

const updateUserDetails = asyncHandler(async (req, res, next) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Please provide all fields");
  }
  //NOTE: we will authenticate user before performing this step and with that we will have user info
  const id = req.user?._id;
  const user = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        fullName: fullName,
        email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  //

  //

  // if (!user) {
  //   throw new ApiError(400, "User not found");
  // }

  // user.fullName = fullName;
  // user.email = email;

  // user.save({ validateBeforeSave: false });

  // //! follwing call can be resource consuming
  // but we are doing it because i want to return the updated user
  // const updatedUser = await User.findById(id);

  return res
    .status(200)
    .json(new ApiResponse(201, user, "User updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res, next) => {

  const id = req.user?._id;

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new error(400, "Avatar file is missing");
  }
  const avatar = await uploadCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new error(400, "Error while uploading avatar");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(201, updatedUser, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res, _) => {

  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new error(400, "Cover file is missing");
  }
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new error(400, "Error while uploading coverImage");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(201, updatedUser, "cover image updated successfully")
    );
});
const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { userName } = req.params;

  if (!userName?.trim) {
    throw new ApiError(401, "Username is missing");
  }
  const channel = await User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        userName: 1,
        email: 1,
        isSubscribed: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(400, "channel not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "channel found"));
});

const getWatchHistory = asyncHandler(async (req, res, _) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    email: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0].watchHistory, "history found successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};

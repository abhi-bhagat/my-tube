import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.service.js";
import jwt from "jsonwebtoken";

import CircularJSON from "circular-json";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // find user
    const user = await User.findById(userId);
    // generate tokens with methods mentioned in schema
    //! make sure to use await
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    // add refresh token to database
    user.refreshToken = refreshToken;
    // save user and make sure that valiation is false as otherwise it will look for all  the required fields in DB
    // but here we are only saving the refresh token
    const retSave = await user.save({ validateBeforeSave: false });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

// asyncHandler is a higher order function that takes in an another function
const registerUser = asyncHandler(async (req, res, next) => {
  /*
STEPS ->  Algorithm
1. validate info at front end
2. send info to backend
3. receive info and validate info
4 .check if user already exist : username or email
5  check for images
6  check for avatar
7. upload image and avatar to cloudinary  -> check if avatar was uploaded successfully or not
8. create user object
9. create entry in DB
10. remove pass and refresh token from response field
11. check for user creation ? return res : check error
*/

  const { userName, fullName, password, email } = req.body;
  const test = req.body;
  console.log(`req.body`);
  // console.log(`${CircularJSON.stringify(req.body)}`);

  // NOTE; we can also check each field individually if that's what we want and is an easy approach

  // STEP 1 check for empty fields
  // advance level error checking
  if (
    [fullName, email, userName, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "Please fill all fields");
  }
  // TODO: add validation for email(regex) , username(>4 chars) and password (maybe check for special chars)
  // HINT: create a separate file for validation

  // STEP 2: checking user exist or not
  const existedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exist");
  }

  //STEP:3   handle images
  // now that we have created middlewares , it will give us acccess to req.file that will have our avatar and coverImage
  // console.log(`i am req.files - >     ${CircularJSON.stringify(req.files)}`);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
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
  // check for avatar as it is required
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file location is required");
  }

  // STEP 4: upload image to cloudinary
  // first upload image and then return the url that we will store in avatar file to DB
  const avatar = await uploadCloudinary(avatarLocalPath);
  //do same for coverImage
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  // console.log(`i am avatar, ${avatar}`);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //STEP 5: create object and then enter it into DB
  // now we have User object that talks to DB

  const user = await User.create({
    fullName: fullName,
    email: email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    userName: userName.toLowerCase(),
    password: password,
  });

  //STEP 6 : Remove password field and refresh token from user response

  // now we will check if user is actually uploaded to the DB or not. if yes then we will chain select method to remove the password and refresh token from DB. whatever has negative sign infront of it, that property will be removed
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  // as user is created we will return api response

  //   return new ApiResponse(201,createdUser,"User created successfully")
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res, next) => {
  // 1. validate info at front end
  // req body data collect
  // validate info with database (username or email)
  // find user
  // if not found tell them to register
  // if yes give access to login
  // generate access token and refresh tokens for user
  // send tokens to user via secure cookies

  const { userName, password, email } = req.body;

  if (!userName && !email) {
    // if (!(userName | email)) {

    throw new ApiError(400, "Please provide username and email");
  }
  const foundUser = await User.findOne({
    $or: [{ email }, { userName }],
  });
  // agr dono k basis pe nahi mila user to matlab user register that e nahi kabhi
  if (!foundUser) {
    throw new ApiError(404, "User not found");
  }
  const passwordValid = await foundUser.isPasswordCorrect(password);
  if (!passwordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  // get access token and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    foundUser._id
  );

  // the foundUser that we had doesn't have refreshToken as it was assigned to it afterwards in the function
  // now either we can update the user with refreshToken or we can make another request to DB to update it
  const updatedFoundUser = await User.findById(foundUser._id).select(
    "-password  -refreshToken"
  );
  // `! console.log(`I am updaredFoundUser ${updatedFoundUser}`);
  // send tokens to cookies.
  // we have to design some options for the cookies
  const options = {
    httpOnly: true, // means only server can modify the cookie
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
  // cookie delete
  // refresh token delete from DB
  //find user to logout
  const foundUser = req.user._id;

  // remove user's refreshToken from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
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
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    new ApiError(401, "Unauthorized request");
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
      new ApiError(401, "Invalid refresh token");
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
    const { newRefreshToken, newAccessToken } =
      await generateAccessAndRefreshTokens(foundUser._id);
    //STEP :  now return the response to the user
    return res
      .status(200)
      .cookies("accessToken", newAccessToken)
      .cookies("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          201,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Problem decoding refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  //EXP: hanji so theory is that we need to check if the user is logged in already or not first! and that will be checked by the auth middleware . if the user is logged in then the auth middleware will return us user in our req.user field and then we can use that to check if the old password that user has entered matches the one saved or not. IF yes then we will save the new password in the DB

  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  // now check if the given password is correct or not
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }
  //STEP: set new password

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
  //NOTE: we will authenticarte user before performing this step and with that we will have user info
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
  ).select("-password - refreshToken");
  // if (!user) {
  //   throw new ApiError(400, "User not found");
  // }

  // user.fullName = fullName;
  // user.email = email;

  // user.save({ validateBeforeSave: false });

  // //! follwing call can be resource consuming
  // // but we are doing it because i want to return the updated user
  // const updatedUser = await User.findById(id);

  return res
    .status(200)
    .json(new ApiResponse(201, user, "User updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res, next) => {
  //Exp: here we have to make sure that we are passing in two middleware in our route files. one will be from multer and other one should be auth.middleware to check if the user is authentic or not.
  const id = req.user?._id;
  //NOTE: all of following is appening after the multer middleware is run
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new error(400, "Avatar file is missing");
  }
  const avatar = await uploadCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new error(400, "Error while uploading avatar");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req,
    user?._id,
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
  //Exp: here we have to make sure that we are passing in two middleware in our route files. one will be from multer and other one should be auth.middleware to check if the user is authentic or not.

  //NOTE: all of following is happening after the multer middleware is run

  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new error(400, "Cover file is missing");
  }
  const coverImage = await uploadCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new error(400, "Error while uploading coverImage");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req,
    user?._id,
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
    throw new ApiError(401, "UserName not found");
  }
  const channel = await User.aggregate([
    //STEP: we find the user
    {
      $match: {
        userName: userName?.toLowerCase(),
      },
    },
    // following will return us all the subscribers for the given channel
    //STEP: we find subscribers for chennel
    {
      $lookup: {
        from: "subscriptions",
        localField: _id,
        foreignField: "channel",
        as: "subscribers",
      },
    },
    //STEP#: find the channels we are subscribed to
    {
      $lookup: {
        from: "subscriptions",
        localField: _id,
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    //STEP4: add some fields that we have to pass to user model, eg. number of subscribers and number of channels we are subscribed to
    {
      $addFields: {
        // how many users are subscribed to us
        subscribersCount: {
          $size: "$subscribers",
        },
        // how many channels have we subscribed to
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        //EXP: now we have to check if we are subscribed to a channel or not. for that we will check if we are in subsscriber or not
        //EXP: if we are then we will return true and if we aren't then we will return false
        //EXP: here we will  use a $cond operator the  will chek the condit,
        //EXP if takes in 3 variables , if then else.
        isSubscribed: {
          $cond: {
            //*- here we are finding the user from req.user as at this moment we will be logged in. we will use $in operator to check if the user is in the subscribers or not. $in takes and array that has "what to find, where to find"
            //* in what to find we have user's id
            //* in where to find we have subscribes that we got from above pipeline
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    //STEP:5 finally,  we will r etuen the selected value of user, for eg we will not retun password and update and created at.
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
  console.log(channel);

  if (!channel?.length) {
    throw new ApiError(400, "channel not found");
  }

  //EXP: remember this channel comes back in form of array that has all the results as objects
  //exp:    [{},{},{}]
  //* so we will try to return in a better way, maybe an object so that frontend is not crying
  return res
    .status(200)
    .json(new ApiResponse(400, channel[0], "channel found"));
});

const getWatchHistory = asyncHandler(async (req, res, _) => {
  const { id } = req.user?._id;
  const user = await User.aggregate(
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
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
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "history found successfully"));
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

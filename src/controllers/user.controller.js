import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.service.js";

import CircularJSON from "circular-json";
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // find user
    const user = await User.findById(userId);
    // generate tokens with methods mentioned in schema
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // add refresh token to database
    user.refreshToken = refreshToken;
    // save user and make sure that valiation is false as otherwise it will look for all  the required fields in DB
    // but here we are only saving the refresh token
    await user.save({ validateBeforeSave: false });

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

  if (!userName || !email) {
    throw new ApiError(400, "Please provide username or email");
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
    "-password -refreshToken"
  );

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

export { registerUser, loginUser, logoutUser };

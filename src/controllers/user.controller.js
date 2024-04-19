import { asyncHandler } from "../utils/asyncHandler.js";

// asyncHandler is a higher order function that takes in an another function
const registerUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ message: "chai aur code" });
});

export { registerUser };

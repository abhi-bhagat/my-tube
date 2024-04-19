// mainly for DB connection

// require("dotenv").config({ path: "./env" });

import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`🚀🚀🚀 Server is running on port ${process.env.PORT} `);
    });
  })
  .catch((error) => {
    console.error(`Mongo DB refused to connect! ${error}`);
  });
/*
//
//
//
//
//
//
//
//
//
//
//
//






















*/

//  *! NOTE: Putting everything in index is not a good practise as by doing this we are polluting the index file
// *?  EXPLANATION :
/*

    ? 1. We are importing mongoose from mongoose.js
    ? 2. Then we are creating an effy function in JS that will run as soon as it is created. 
    ?    in that function we put all out connection code.
    ? 3. then we use try catch method to connect to out DB in async await function
    ? 4.Some people will import express in same file and then make some get requests that will check if express   is talking to backend or not
    ? 5. then we are using app.on to listen to all errors
    ? 6. then we are using app.listen to listen to all requests
*/
/*


import { DB_NAME } from "./constants";
import app from "express";
const express = express()(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.error(`Error talking to DB from express ${error}`);
    });
    app.listen(`${process.env.PORT}`, () => {
      console.log(`App is listening on port ${process.env.PORT} 🚀`);
    });
  } catch (error) {
    console.error(`Error connecting DB: ${error.message}`);
    throw error;
  }
})();
*/

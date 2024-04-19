// 1st way-> using try catch
const asyncHandlerTryCatch = (func) => {
  return async (req, res, next) => {
    try {
      await func(req, res, next);
    } catch (error) {
      console.error(`Error ${error}`);
      res.status(error.code || 500).json({
        success: false,
        message: error.message,
      });
    }
  };
};
// the above code wrapper is in try catch block.

// in some codebases we can also have it in Promises form that i've shown below

const asyncHandlerPromiseVersion = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      next(error);
    });
  };
};

// compact version of above

const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(
    requestHandler(req, res, next).catch((error) => {
      res
        .status(process.env.error || 500)
        .json({ success: false, message: error.message });
      next(error);
    })
  );
};
export { asyncHandler };

class ApiResponse {
  /**
   * @constructor
   * @param {number} status HTTP status code
   * @param {*} body Response data
   * @param {string} message Human-readable message
   */
  constructor(status, body, message) {
    this.status = status;
    this.body = body;
    this.message = message;
    this.success = status < 400;
  }

}

export { ApiResponse };

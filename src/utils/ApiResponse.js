class ApiResponse {
    /**
     * @constructor
     * @param {number} statusCode - HTTP status code
     * @param {*} data - Response data
     * @param {string} message - Message
     */
    constructor(statusCode, data, message = "Success") {
        /**
         * HTTP status code
         * @type {number}
         */
        this.statusCode = statusCode;

        /**
         * Response data
         * @type {*}
         */
        this.data = data;

        /**
         * Message
         * @type {string}
         */
        this.message = message;

        /**
         * Success boolean
         * @type {boolean}
         */
        this.success = statusCode < 400;
    }

}
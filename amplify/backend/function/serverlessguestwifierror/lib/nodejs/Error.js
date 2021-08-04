Errors = {
  BadRequest: {
    status: 400,
    message: "Request has wrong format."
  },
  Unauthorized: {
    status: 401,
    message: "Authentication credentials not valid."
  },
  Forbidden: {
    status: 403,
    message: "You're missing permission to execute this request."
  },
  NotFound: {
    status: 404,
    message: "The requested resource could not be found"
  },
  InternalServerError: {
    status: 500,
    message: "An interal server error occurred. Please contact the administrator."
  }
}

class RESTError extends Error {

  constructor({status, message}, invalidParams=[], ...params) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RESTError)
    }

    this.name = 'RESTError'
    this.status = status
    this.message = message
    this.invalidParams = invalidParams
  }
}

module.exports = { Errors, RESTError}
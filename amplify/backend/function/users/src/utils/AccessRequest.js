const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

const { Errors, RESTError } = require('./Errors')

class AccessRequest {
  constructor(id, hostEmail, guestEmail) {
    
    const date = new Date()
    const epoch = date.getTime()

    this.id = id
    this.hostEmail = hostEmail
    this.guestEmail = guestEmail
    this.status = 'created'
    this.createdAt = epoch
    this.modifiedAt = epoch
  }

  async queryDynamoDB() {
    console.log(`[AccessRequest][queryDynamoDB()] Querying access request with id=${this.id} in DynamoDB`)
    const params = {
      TableName: process.env.STORAGE_ACCESSREQUEST_NAME,
      Key: {
        id: this.id
      }
    }
    try {
      const response = await docClient.get(params).promise()
      if (response.hasOwnProperty('Item')) {
        console.log(`[AccessRequest][queryDynamoDB()] Found access request with id=${this.id} in DynamoDB`)
        const accessRequest = response.Item
        this.hostEmail = accessRequest.hostEmail ? accessRequest.hostEmail : this.hostEmail
        this.guestEmail = accessRequest.guestEmail ? accessRequest.guestEmail : this.guestEmail
        this.status = accessRequest.status ? accessRequest.status : this.status
        this.createdAt = accessRequest.createdAt ? accessRequest.createdAt : this.createdAt
      }
      else {
        console.log(`[AccessRequest][queryDynamoDB()] Access request not found with id=${this.id} in DynamoDB`)
        this.existsInDynamoDB = false
      }
    } catch(err) {
      console.warn(`[AccessRequest][queryDynamoDB()] An error occurred for access request with id=${this.id} when querying DynamoDB`)
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        // Throw error
        throw new RESTError(Errors.InternalServerError)
      }
    }
  }

  async commitToDynamoDB() {
    console.log(`[AccessRequest][commitToDynamoDB()] Committing accessRequest with id=${this.id} in DynamoDB`)

    try {
      const params = {
        TableName: process.env.STORAGE_ACCESSREQUEST_NAME,
        Item: {
          id: this.id,
          guestEmail: this.guestEmail,
          hostEmail: this.hostEmail,
          status: this.status,
          createdAt: this.createdAt,
          modifiedAt: this.modifiedAt
        }
      }
      const data = await docClient.put(params).promise();
      const user = data.Item
      console.log(`[AccessRequest][commitToDynamoDB()] Committed accessRequest with id=${this.id} in DynamoDB`)
      this.existsInDynamoDB = true
      return
    } catch (err) {
      console.warn(`[AccessRequest][commitToDynamoDB()] Failed to commit accessRequest with id=${this.id} in DynamoDB`)
      // Throw error
      throw new RESTError(Errors.InternalServerError)
    }
  }
}

module.exports = AccessRequest
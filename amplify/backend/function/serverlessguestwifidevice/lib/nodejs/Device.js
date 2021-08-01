const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()


class Device {
  constructor(env={}, Meraki, Errors, RESTError, serial, email='') {
    this.secret = {}
    /*
     * secret = {
     *   MERAKI_API_KEY: ''
     * }
     */
    this.env = env
    /*
     * env = {
     *   MERAKI_BASE_URL: '',
     *   MERAKI_ORGANIZATION_ID: '',
     *   MERAKI_NETWORK_ID: '',
     *   STORAGE_DEVICE_NAME: ''
     * }
     */
    this.serial = serial
    this.email = email
    this.existsInDynamoDB = false
    this.existsInMerakiInventory = false
    this.existsInMerakiNetwork = false
    this.emailMatches = false
    this.hasDataConflict = false
    this.meraki = Meraki
    this.RESTError = RESTError
    this.Errors = Errors
  }

  async init() {
    /*
     * Queries DynamoDB and Meraki Dashboard
     */

    // Check if it exists in Meraki Dashboard
    console.log(`[Device][init()] Looking up device with serial=${this.serial} in DynamoDB and Meraki Dashboard`)
    try {
      await Promise.all([this.queryDynamoDB(), this.queryMerakiDashboard()])
    } catch(err) {
      console.warn(`[Device][init()] Failed to look up device with serial=${this.serial} in DynamoDB and Meraki Dashboard`)
      if (err instanceof this.RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new this.RESTError(this.Errors.InternalServerError)
      }
    } finally {
      console.log(`[Device][init()] Check device with serial=${this.serial} for data conflict in DynamoDB and Meraki Dashboard`)
      this.checkDataConflict()
    }
    console.log(`[Device][init()] Found device with serial=${this.serial} in DynamoDB and Meraki Dashboard`)
  }

  checkDataConflict() {
    // If serial exists in DynamoDB and Meraki Network or
    // does not exist in DynamoDB and Meraki Network, then there is no data conflict
    if (this.existsInDynamoDB === this.existsInMerakiNetwork) {
      console.log('[Device][checkDataConflict()] No conflict between DynamoDB and Meraki Dashboard')
      this.hasDataConflict = false
    }
    // Does not exist in DynamoDB but exists in Meraki Dashboard
    // Exists in DynamoDB but does not exist in Meraki Dashboard
    else {
      console.log('[Device][checkDataConflict()] Conflict between DynamoDB and Meraki Dashboard')
      this.hasDataConflict = true
    }
  }

  async queryDynamoDB() {
    console.log(`[Device][queryDynamoDB()] Querying device with serial=${this.serial} in DynamoDB`)
    const params = {
      TableName: this.env.STORAGE_DEVICE_NAME,
      Key: {
        serial: this.serial
      }
    }
    try {
      const response = await docClient.get(params).promise()
      if (response.hasOwnProperty('Item')) {
        console.log(`[Device][queryDynamoDB()] Found device with serial=${this.serial} in DynamoDB`)
        const device = response.Item
        // If email is specified for this object and
        // requested email does not equal to the email in DynamoDB,
        // then throw an error
        if (this.email && this.email != device.email) {
          console.warn(`[Device][queryDynamoDB()] Requested email=${this.email} does not match email=${device.email} in DynamoDB`)
          throw new this.RESTError(this.Errors.NotFound)
        }
        this.serial = device.serial
        this.email = device.email
        this.existsInDynamoDB = true
      }
      else {
        console.log(`[Device][queryDynamoDB()] Device not found with serial=${this.serial} in DynamoDB`)
        this.existsInDynamoDB = false
      }
    } catch(err) {
      console.warn(`[Device][queryDynamoDB()] Failed to get device with serial=${this.serial} in DynamoDB`)
      this.error = true
      if (err instanceof this.RESTError) {
        throw err
      }
      else {
        console.warn(err)
        // Throw error
        throw new this.RESTError(this.Errors.InternalServerError)
      }
    }
  }

  async queryMerakiDashboard() {
    console.log(`[Device][queryMerakiDashboard()] Querying device with serial=${this.serial} in Meraki Dashboard`)
    try {
      const data = await this.meraki.getOrganizationInventoryDevice(this.env.MERAKI_ORGANIZATION_ID, this.serial)
      // If networkId is not null, then the serial exists in the network
      if (data.networkId) {
        console.log(`[Device][queryMerakiDashboard()] Found device with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiNetwork = true
        this.existsInMerakiInventory = true
      }
      // If networkId is null, then the serial exists in inventory
      else {
        console.log(`[Device][queryMerakiDashboard()] Device not found with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiInventory = true
      }
      this.checkDataConflict()
    } catch(error) {
      console.warn(`[Device][queryMerakiDashboard()] Failed to find device with serial=${this.serial} in Meraki Dashboard`)
      console.warn(error)
      // If 404, then the serial does not exist in the organization/network
      // It could also be an invalid serial so throw an error
      switch (error.status) {
        case 404:
          this.existsInMerakiInventory = false
          this.existsInMerakiNetwork = false
          // Don't throw error as this is normal
          // For example, a user can try to add a device that doesn't exist in the Meraki Organization
          break
        default:
          this.error = true
          throw new this.RESTError(this.Errors.InternalServerError)
      }
    }
  }

  async commitToDynamoDB() {
    console.log(`[Device][commitToDynamoDB()] Committing device with serial=${this.serial} in DynamoDB`)
    try {
      const params = {
        TableName: this.env.STORAGE_DEVICE_NAME,
        Item: {
          serial: this.serial,
          email: this.email
        }
      }
      const data = await docClient.put(params).promise();
      const device = data.Item
      console.log(`[Device][commitToDynamoDB()] Committed device with email=${this.serial} in DynamoDB`)
      this.existsInDynamoDB = true
      this.checkDataConflict()
    } catch (err) {
      console.warn(`[Device][commitToDynamoDB()] Failed to commit device with email=${this.serial} in DynamoDB, ${err}`)
      // Throw error
      throw new this.RESTError(this.Errors.InternalServerError)
    }
  }

  async addToMerakiInventory() {
    console.log(`[Device][addToMerakiInventory()] Adding device with serial=${this.serial} in Meraki inventory`)
    try {
      const response = await this.meraki.claimIntoOrganization(this.env.MERAKI_ORGANIZATION_ID, [this.serial])
      this.existsInMerakiInventory = true
      console.info(`[Device][addToMerakiInventory()] Success adding device with serial=${this.serial} in Meraki inventory`)
    } catch(error) {
      console.warn(`[Device][addToMerakiInventory()] Failed to add device with serial=${this.serial} in Meraki inventory`)
      console.warn(error)
      this.existsInMerakiInventory = false
      switch (error.status) {
        case 400:
          throw new this.RESTError({
            ...this.Errors.BadRequest,
            message: error.message
          }, [{
            param: 'serial',
            msg: 'Invalid serial number'
          }])
        case 404:
          throw new this.RESTError(this.Errors.NotFound)
        default:
          throw new this.RESTError(this.Errors.InternalServerError)
      }
    } finally {
      this.checkDataConflict()
    }
  }

  async addToMerakiNetwork() {
    console.log(`[Device][addToMerakiNetwork()] Adding device with serial=${this.serial} in Meraki Network`)
    try {
      const response = await this.meraki.claimNetworkDevices(this.env.MERAKI_NETWORK_ID, [this.serial])
      console.log(`[Device][addToMerakiNetwork()] Added device with serial=${this.serial} in Meraki Network`)
      this.existsInMerakiNetwork = true
    } catch(error) {
      console.warn(`[Device][addToMerakiInventory()] Failed to add device with serial=${this.serial} in Meraki Network`)
      console.warn(error)
      this.existsInMerakiNetwork = false
      switch (response.status) {
        case 400:
          if (error.message === `Device with serial ${req.body.serial} is already claimed`) {
            throw new this.RESTError({
              ...this.Errors.BadRequest, 
              message: 'Serial is already claimed in a different Meraki Organization or if you have just unclaimed from an organization, please try again in 30 minutes.',
              'invalid-params': [
                {
                  param: 'serial',
                  msg: 'Invalid serial number'
                }
              ]
            })
          }
          else {
            throw new this.RESTError(this.Errors.BadRequest)
          }
        case 404:
          throw new this.RESTError(this.Errors.NotFound)
        default:
          throw new this.RESTError(this.Errors.InternalServerError)
      }
    } finally {
      this.checkDataConflict()
    }
  }

  async removeFromDynamoDB() {
    console.log(`[Device][removeFromDynamoDB()] Removing device with serial=${this.serial} in DynamoDB`)

    const params = {
      TableName: this.env.STORAGE_DEVICE_NAME,
      Key: {
        serial: this.serial
      }
    }
    try {
      const data = await docClient.delete(params).promise()
      console.log(`[Device][removeFromDynamoDB()] Removed device with serial=${this.serial} in DynamoDB`)
      this.existsInDynamoDB = false
      this.checkDataConflict()
    } catch (err) {
      console.warn(`[Device][removeFromDynamoDB()] Failed to remove device with serial=${this.serial} in DynamoDB`)
      console.warn(err)
      throw new this.RESTError(this.Errors.InternalServerError)
    }
  }

  async removeFromMerakiNetwork() {
    console.log(`[Device][removeFromMerakiNetwork()] Removing device with serial=${this.serial} in Meraki Network`)
    try {
      const response = await this.meraki.removeNetworkDevices(this.env.MERAKI_NETWORK_ID, this.serial)
      console.log(`[Device][removeFromMerakiNetwork()] Removed device with serial=${this.serial} in Meraki Network`)
      this.existsInMerakiInventory = false
      this.existsInMerakiNetwork = false
    } catch (error) {
      console.warn(`[Device][removeFromMerakiNetwork()] Failed to remove device with serial=${this.serial} in Meraki Network`)
      console.warn(error)
      switch(error.status) {
        case 404:
          this.existsInMerakiInventory = false
          this.existsInMerakiNetwork = false
          throw new this.RESTError(this.Errors.NotFound)
        default:
          throw new this.RESTError(this.Errors.InternalServerError)
      }
    } finally {
      this.checkDataConflict()
    }
  }
}

module.exports = { Device }
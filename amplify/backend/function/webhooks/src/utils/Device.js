const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

const fetch = require('node-fetch')

const Meraki = require('./Meraki')
const { Errors, RESTError } = require('./Errors')


class Device {
  constructor(serial, email='') {
    this.serial = serial
    this.email = email
    this.existsInDynamoDB = false
    this.existsInMerakiInventory = false
    this.existsInMerakiNetwork = false
    this.emailMatches = false
    this.hasDataConflict = false
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
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new RESTError(Errors.InternalServerError)
      }
    }
    console.log(`[Device][init()] Found device with serial=${this.serial} in DynamoDB and Meraki Dashboard`)
    console.log(`[Device][init()] Check device with serial=${this.serial} for data conflict in DynamoDB and Meraki Dashboard`)
    this.checkDataConflict()
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
      TableName: process.env.STORAGE_DEVICE_NAME,
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
          throw new RESTError(Errors.NotFound)
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

  async queryMerakiDashboard() {
    console.log(`[Device][queryMerakiDashboard()] Querying device with serial=${this.serial} in Meraki Dashboard`)
    const meraki = new Meraki(process.env.MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
    try {
      const response = await meraki.getOrganizationInventoryDevice(process.env.MERAKI_ORGANIZATION_ID, this.serial)
      // If 200, then the serial does exist in the organization's inventory
      if (response.status === 200) {
        console.log(`[Device][queryMerakiDashboard()] Found device with serial=${this.serial} in Meraki Dashboard`)
        this.existsInMerakiInventory = true
        const data = await response.json()
        // If networkId is not null, then the serial exists in the network
        if (data.networkId) {
          console.log(`[Device][queryMerakiDashboard()] Found device with serial=${this.serial} in Meraki Network`)
          this.existsInMerakiNetwork = true
        }
        else {
          console.log(`[Device][queryMerakiDashboard()] Device not found with serial=${this.serial} in Meraki Network`)
        }
      }
      // Else if 404, then the serial does not exist in the organization/network
      // It could also be an invalid serial so throw an error
      else if (response.status === 404) {
        console.log(`[Device][queryMerakiDashboard()] Device not found with serial=${this.serial} in Meraki Dashboard`)
        this.existsInMerakiInventory = false
        this.existsInMerakiNetwork = false
        throw new RESTError(Errors.NotFound)
      }
      else {
        const data = await response.json()
        throw new Error(data.errors)
      }
    } catch(err) {
      console.warn(`[Device][queryMerakiDashboard()] Failed to get device with serial=${this.serial} in Meraki Dashboard`)
      this.error = true
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new RESTError(Errors.InternalServerError)
      }
    }
  }

  async commitToDynamoDB() {
    console.log(`[Device][commitToDynamoDB()] Committing device with serial=${this.serial} in DynamoDB`)
    try {
      const params = {
        TableName: process.env.STORAGE_DEVICE_NAME,
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
      throw new RESTError(Errors.InternalServerError)
    }
  }

  async addToMerakiInventory() {
    console.log(`[Device][addToMerakiInventory()] Adding device with serial=${this.serial} in Meraki inventory`)
    const meraki = new Meraki(process.env.MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
    try {
      const response = await meraki.claimIntoOrganization(process.env.MERAKI_ORGANIZATION_ID, [this.serial])
      
      if (response.status === 400) {
        console.warn(`[Device][addToMerakiInventory()] Invalid device with serial=${this.serial}`)
        this.existsInMerakiInventory = false
        this.existsInMerakiNetwork = false
        this.checkDataConflict()
        const data = await response.json()
        if (data.errors === `Device with serial ${req.body.serial} is already claimed`) {
          throw new RESTError({
            ...Errors.BadRequest, 
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
          throw new RESTError(Errors.BadRequest)
        }
      }
      else if (response.status === 404) {
        console.warn(`[Device][addToMerakiInventory()] Invalid device with serial=${this.serial}`)
        this.existsInMerakiInventory = false
        throw new RESTError(Errors.NotFound)
      }
      else if (response.status < 200 || response.status > 299) {
        console.warn(`[Device][addToMerakiInventory()] Something went wrong when adding device with serial=${this.serial} in Meraki inventory`)
        throw new RESTError(Errors.InternalServerError)
      }
      else {
        console.log(`[Device][addToMerakiInventory()] Added device with serial=${this.serial} in Meraki inventory`)
        this.existsInMerakiInventory = true
      }
    } catch (err) {
      console.warn(`[Device][addToMerakiInventory()] Failed to add device with serial=${this.serial} in Meraki inventory`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new RESTError(Errors.InternalServerError)
      }
    }
  }

  async addToMerakiNetwork() {
    console.log(`[Device][addToMerakiNetwork()] Adding device with serial=${this.serial} in Meraki Network`)
    const meraki = new Meraki(process.env.MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
    try {
      const response = await meraki.claimNetworkDevices(process.env.MERAKI_NETWORK_ID, [this.serial])
      if (response.status === 404) {
        console.warn(`[Device][addToMerakiNetwork()] Device not found with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiNetwork = false
        this.checkDataConflict()
        throw new RESTError(Errors.NotFound)
      }
      else if (response.status < 200 || response.status > 299) {
        console.warn(`[Device][addToMerakiNetwork()] Something went wrong when adding device with serial=${this.serial} in Meraki Network`)
        throw new RESTError(Errors.InternalServerError)
      }
      else {
        console.log(`[Device][addToMerakiNetwork()] Added device with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiNetwork = true
        this.checkDataConflict()
      }
    } catch(err) {
      console.warn(`[Device][addToMerakiNetwork()] Failed to add device with serial=${this.serial} in Meraki Network`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new RESTError(Errors.InternalServerError)
      }
    }
  }

  async removeFromDynamoDB() {
    console.log(`[Device][removeFromDynamoDB()] Removing device with serial=${this.serial} in DynamoDB`)

    const params = {
      TableName: process.env.STORAGE_DEVICE_NAME,
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
      throw new RESTError(Errors.InternalServerError)
    }
  }

  async removeFromMerakiNetwork() {
    console.log(`[Device][removeFromMerakiNetwork()] Removing device with serial=${this.serial} in Meraki Network`)
    const meraki = new Meraki(process.env.MERAKI_API_KEY, process.env.MERAKI_BASE_URL)
    try {
      const response = await meraki.removeNetworkDevices(process.env.MERAKI_NETWORK_ID, this.serial)
      
      if (response.status === 404) {
        console.warn(`[Device][removeFromMerakiNetwork()] Device not found with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiInventory = false
        this.existsInMerakiNetwork = false
        this.checkDataConflict()
        throw new RESTError(Errors.NotFound)
      }
      else if (response.status < 200 || response.status > 299) {
        console.warn(`[Device][removeFromMerakiNetwork()] Something went wrong when removing device with serial=${this.serial} in Meraki Network`)
        throw new RESTError(Errors.InternalServerError)
      }
      else {
        console.log(`[Device][removeFromMerakiNetwork()] Removed device with serial=${this.serial} in Meraki Network`)
        this.existsInMerakiInventory = false
        this.existsInMerakiNetwork = false
        this.checkDataConflict()
      }
    } catch (err) {
      console.warn(`[Device][removeFromMerakiNetwork()] Failed to remove device with serial=${this.serial} in Meraki Network`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new RESTError(Errors.InternalServerError)
      }
    }
  }
}

module.exports = Device
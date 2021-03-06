const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()

const { v4: uuidv4 } = require('uuid')


function generatePassword() {
  let length = 8,
      charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}


class User {
  constructor(env={}, Meraki, Webex, Errors, RESTError, email='') {
    this.env = env
    /*
     * env = {
     *   MERAKI_NETWORK_ID: '',
     *   STORAGE_USER_NAME: ''
     * }
     */
    this.firstName = ''
    this.lastName = ''
    this.email = email
    this.company = ''
    this.webexRoomId = ''
    this.webexWebhookId = ''
    this.merakiAuthUserIds = {}
    this.accessRequestId = uuidv4()
    this.devices = []
    this.secret = uuidv4()
    this.existsInDynamoDB = false
    this.password = generatePassword()
    this.meraki = Meraki
    this.webex = Webex
    this.RESTError = RESTError
    this.Errors = Errors
  }

  async init() {
    console.log(`[User][init()] Looking up user with email=${this.email} in DynamoDB`)

    // Check if user exists in DynamoDB
    // If the user exists, change this.existsInDynamoDB flag to true
    const params = {
      TableName: this.env.STORAGE_USER_NAME,
      Key: {
        email: this.email
      }
    }
    try {
      const data = await docClient.get(params).promise()
      if (data.hasOwnProperty('Item')) {
        console.log(`[User][init()] User found with email=${this.email} in DynamoDB`)
        const user = data.Item
        this.firstName = 'firstName' in user ? user.firstName : this.firstName
        this.lastName = 'lastName' in user ? user.lastName : this.lastName
        this.email = 'email' in user ? user.email : this.email
        this.company = 'company' in user ? user.company : this.company
        this.devices = 'devices' in user ? user.devices : this.devices
        this.webexRoomId = 'webexRoomId' in user ? user.webexRoomId : this.webexRoomId
        this.webexWebhookId = 'webexWebhookId' in user ? user.webexWebhookId : this.webexWebhookId
        this.merakiAuthUserIds = 'merakiAuthUserIds' in user ? user.merakiAuthUserIds : this.merakiAuthUserIds
        this.accessRequestId = 'accessRequestId' in user ? user.accessRequestId : this.accessRequestId
        this.secret = 'secret' in user ? user.secret : this.secret
        this.existsInDynamoDB = true
      }
      else {
        console.log(`[User][init()] User not found with email=${this.email} in DynamoDB`)
        this.existsInDynamoDB = false
      }
    } catch (e) {
      console.warn(`[User][init()] Failed to get user with email=${this.email} in DynamoDB`)
      // Throw error
      throw new this.RESTError(Errors.InternalServerError)
    }
  }

  async commitToDynamoDB() {
    console.log(`[User][commitToDynamoDB()] Committing user with email=${this.email} in DynamoDB`)

    try {
      const params = {
        TableName: this.env.STORAGE_USER_NAME,
        Item: {
          email: this.email,
          firstName: this.firstName,
          lastName: this.lastName,
          company: this.company,
          devices: this.devices,
          webexRoomId: this.webexRoomId,
          webexWebhookId: this.webexWebhookId,
          merakiAuthUserIds: this.merakiAuthUserIds,
          accessRequestId: this.accessRequestId,
          secret: this.secret
        }
      }
      const data = await docClient.put(params).promise();
      const user = data.Item
      console.log(`[User][commitToDynamoDB()] Committed user with email=${this.email} in DynamoDB`)
      this.existsInDynamoDB = true
      return
    } catch (err) {
      console.warn(`[User][commitToDynamoDB()] Failed to commit user with email=${this.email} in DynamoDB, ${err}`)
      // Throw error
      throw new this.RESTError(Errors.InternalServerError)
    }
  }

  removeSerialFromDevices(serial) {
    console.log(`[User][removeSerialFromDevices()] Removing serial=${serial} in user.devices with email=${this.email} in DynamoDB`)
    // If length of user.devices is greater than 0
    if (this.devices.length > 0) {
      const index = this.devices.indexOf(serial)
      // If the serial exists in user.devices 
      if (index > -1) {
        this.devices.splice(index, 1)
      }
      else {
        console.warn(`[User][removeSerialFromDevices()] Failed to find serial=${serial} in user.devices with email=${this.email} in DynamoDB`)
      }
    }
    else {
      console.warn(`[User][removeSerialFromDevices()] Failed to remove=${serial} from user.devices.length=0 with email=${this.email} in DynamoDB`)
    }
  }

  async sendWebexText(webexAccessToken, text) {
    console.log(`[User][sendWebexText()] Sending Webex text=${text} to user with email=${this.email}`)
    try {
      const body = {
        toPersonEmail: this.email,
        text: text
      }
      const response = await this.webex.createMessage(body)
      return response
    } catch(error) {
      console.warn(`[User][sendWebexText()] Failed to send text=${text} to user with email=${this.email}`)
      console.warn(error)
      switch (error.status) {
        case 404:
          throw new this.RESTError({
            ...Errors.NotFound,
            message: 'You need a Webex Teams account for the email you have entered to use this service.'
          },
          [{
            param: 'email',
            msg: 'Invalid email address'
          }])
        default:
          throw new this.RESTError(Errors.InternalServerError)
      }
    }
  }

  async sendWebexCard(webexAccessToken, markdown, card) {
    console.log(`[User][sendWebexCard()] Sending Webex card to user with email=${this.email}`)
    try {
      const body = {
        roomId: this.webexRoomId,
        markdown: markdown,
        attachments: [card]
      }
      const response = await this.webex.createMessage(body)
    } catch(error) {
      console.warn(`[User][sendWebexCard()] Failed to send Webex card to user with email=${this.email}`)
      console.warn(error)
      // Throw error
      throw new this.RESTError(Errors.InternalServerError)
    }
  }

  async sendWebexWelcomeText(webexAccessToken) {
    console.log(`[User][sendWebexWelcomeText()] Sending welcome message to user with email=${this.email}`)
    try {
      const body = {
        toPersonEmail: this.email,
        text: "Hello. Welcome to the Guest Wi-Fi Demo App."
      }
      const response = await this.webex.createMessage(body)
      this.webexRoomId = response.roomId
      console.log(`[User][sendWebexWelcomeText()] Updated webexRoomId in user with email=${this.email}`)
    } catch(error) {
      console.warn(`[User][sendWebexWelcomeText()] Failed to send welcome text to user with email=${this.email}`)
      console.warn(error)
      switch (error.status) {
        case 404:
          throw new this.RESTError({
            ...Errors.NotFound,
            message: 'You need a Webex Teams account for the email you have entered to use this service.'
          },
          [{
            param: 'email',
            msg: 'Invalid email address'
          }])
        default:
          throw new this.RESTError(Errors.InternalServerError)
      }
    }
  }

  async createWebexWebhook(webexAccessToken, name, resource, event, targetUrl, filter, secret) {
    console.log(`[User][createWebexWebhook()] Creating Webex Webhook for user with email=${this.email}`)
    try {
      const body = {
        name: name,
        resource: resource,
        event: event,
        targetUrl: targetUrl,
        filter: filter,
        secret: secret
      }
      const response = await this.webex.createWebhook(body)
      this.webexWebhookId = response.id
    } catch(err) {
      console.warn(`[User][createWebexWebhook()] Failed to create Webex Webhook for user with email=${this.email}`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new this.RESTError(Errors.InternalServerError)
      }
    }
  }

  async createMerakiAuthUser(authorizations, accountType, emailPasswordToUser) {
    console.log(`[User][createMerakiAuthUser()] Creating Meraki Auth user with email=${this.email}`)
    const name = `${this.firstName} ${this.lastName}`
    if (!this.password) {
      this.password = generatePassword()
    }
    try {
      const merakiAuthUser = await this.meraki.createNetworkMerakiAuthUser(this.env.MERAKI_NETWORK_ID, this.email, name, this.password, authorizations, accountType, emailPasswordToUser)
      authorizations.forEach(auth => this.merakiAuthUserIds[auth.ssidNumber] = merakiAuthUser.id)
    } catch(err) {
      console.warn(`[User][createMerakiAuthUser()] Failed to create Meraki Auth user with email=${this.email}`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new this.RESTError(Errors.InternalServerError)
      }
    }
  }

  async updateMerakiAuthUser(authorizations, emailPasswordToUser) {
    console.log(`[User][updateMerakiAuthUser()] Updating Meraki Auth user with email=${this.email}`)
    const merakiAuthUserId = this.merakiAuthUserIds[authorizations[0].ssidNumber]
    if (!this.password) {
      this.password = generatePassword()
    }
    try {
      const response = await this.meraki.updateNetworkMerakiAuthUser(this.env.MERAKI_NETWORK_ID, merakiAuthUserId, this.password, authorizations, emailPasswordToUser)
      const merakiAuthUser = await response.json()
    } catch(err) {
      console.warn(`[User][updateMerakiAuthUser()] Failed to update Meraki Auth user with email=${this.email}`)
      // Throw error
      if (err instanceof RESTError) {
        throw err
      }
      else {
        console.warn(err)
        throw new this.RESTError(Errors.InternalServerError)
      }
    }
  }
}

module.exports = { User }
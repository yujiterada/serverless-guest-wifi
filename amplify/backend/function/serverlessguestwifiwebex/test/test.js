const expect = require('chai')
const assert = require('assert')
const { Webex } = require('../lib/nodejs/Webex')
const { GuestArrivalCard } = require('../lib/nodejs/card/GuestArrivalCard')


const token = process.env.WEBEX_TOKEN
const invalidToken = token.slice(0, -1)
const baseUrl = process.env.WEBEX_BASE_URL
const invalidBaseUrl = baseUrl.slice(0, -1)
const email = process.env.WEBEX_TO_PERSON_EMAIL
const fullName = process.env.WEBEX_TO_PERSON_FULLNAME
const organization = process.env.WEBEX_TO_PERSON_ORGANIZATION
const invalidEmail = email.slice(0, -1)
let roomId = ""
let validWebexWebhookId = ""


describe('Webex.js tests', () => {
  describe('Generic Test', () => {
    // Invalid token
    it('should return 401 "The request requires a valid access token set in the Authorization request header."', async () => {
      const webex = new Webex(invalidToken, baseUrl)
      webex.logging = false
      try {
        const body = {
          toPersonEmail: email,
          text: 'test'
        }
        const response = await webex.createMessage(body)
      } catch(error) {
        assert.strictEqual(error.status, 401)
        assert.strictEqual(error.message, `The request requires a valid access token set in the Authorization request header.`)
      }
    }).timeout(10000)
    // Invalid base URL
    it('should return 404 "The requested resource could not be found."', async () => {
      const webex = new Webex(token, invalidBaseUrl)
      webex.logging = false
      try {
        const body = {
          toPersonEmail: email,
          text: 'test'
        }
        const response = await webex.createMessage(body)
      } catch(error) {
        assert.strictEqual(error.status, 404)
        assert.strictEqual(error.message, `The requested resource could not be found.`)
      }
    }).timeout(10000)
  })

  describe('Webex Messaging Tests', () => {
    const webex = new Webex(token, baseUrl)
    webex.logging = false
    // Check invalid email
    it('should return 404 "Failed to find user with specified email address."', async () => {
      try {
        const body = {
          toPersonEmail: invalidEmail,
          text: 'test'
        }
        const response = await webex.createMessage(body)
      } catch(error) {
        assert.strictEqual(error.status, 404)
        assert.strictEqual(error.message, "Failed to find user with specified email address.")
      }
    }).timeout(10000)
    // Missing toPersonEmail in body
    it('should return 400 "Message destination could not be determined. Provide only one destination in the roomId, toPersonEmail, or toPersonId field"', async () => {
      try {
        const body = {
          text: 'test'
        }
        const response = await webex.createMessage(body)
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.message, "Message destination could not be determined. Provide only one destination in the roomId, toPersonEmail, or toPersonId field")
      }
    }).timeout(10000)
    // Missing text in body
    it('should return 400 "Both text and file cannot be empty."', async () => {
      try {
        const body = {
          toPersonEmail: invalidEmail
        }
        const response = await webex.createMessage(body)
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.message, "Both text and file cannot be empty.")
      }
    }).timeout(10000)
    // Create message (text) with valid toPersonEmail and body
    it('should return 200', async () => {
      const text = 'test'
      const body = {
        toPersonEmail: email,
        text: text
      }
      // response = {id, roomId, toPersonEmail, roomType, text, personId, personEmail, created}
      const response = await webex.createMessage(body)
      roomId = response.roomId
      assert.strictEqual(response.toPersonEmail, email)
      assert.strictEqual(response.text, text)
    }).timeout(10000)
    // Create message (card) with valid toPersonEmail and body
    it('should return 200', async () => {
      const accessRequestId = 'testId'
      const markdown = 'Test markdown'
      const card = GuestArrivalCard(fullName, organization, email, accessRequestId)
      const body = {
        roomId: roomId,
        markdown: markdown,
        attachments: [card]
      }
      // response = {id, roomId, roomType, roomType, text, attachments, personId, personEmail, markdown, html, created}
      const response = await webex.createMessage(body)
      assert.strictEqual(response.roomId, roomId)
      assert.strictEqual(response.markdown, markdown)
    }).timeout(10000)
  })

  describe('Webhook Tests', () => {
    const webex = new Webex(token, baseUrl)
    webex.logging = false
    // Create webhook with invalid body
    it('should return 400 "Bad Request"', async () => {
      try {
        const name = 'test'
        const resource = 'attachmentActions'
        const secret = 'test'
        const body = {
          name: name,
          resource: resource,
          event: 'created',
          filter: `roomId=${roomId}`,
          secret: secret
        }
        const response = await webex.createWebhook(body)
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.statusText, 'Bad Request')
      }
    }).timeout(10000)
    // Create webhook with valid body
    it('should return 200', async () => {
      const name = 'test'
      const resource = 'attachmentActions'
      const targetUrl = 'https://apicli.com'
      const secret = 'test'
      const body = {
        name: name,
        resource: resource,
        event: 'created',
        targetUrl: 'https://apicli.com',
        filter: `roomId=${roomId}`,
        secret: secret
      }
      // response = {id, name, targetUrl, resource, event, filter, secret, orgId, createdBy, appId, ownedBy, status, created}
      const response = await webex.createWebhook(body)
      validWebexWebhookId = response.id
      assert.strictEqual(response.name, name)
      assert.strictEqual(response.resource, resource)
      assert.strictEqual(response.targetUrl, targetUrl)
      assert.strictEqual(response.secret, secret)
      assert.strictEqual(response.status, 'active')
    }).timeout(10000)
    // Delete webhook with invalid webhookId
    it('should return 404 "Not Found"', async () => {
      try {
        const invalidWebhookId = 'test'
        await webex.deleteWebhook(invalidWebhookId)
      } catch(error) {
        assert.strictEqual(error.status, 404)
        assert.strictEqual(error.statusText, 'Not Found')
      }
    }).timeout(10000)
    // Delete webhook with valid webhookId
    it('should return 200', async () => {
      // response = {}
      const response = await webex.deleteWebhook(validWebexWebhookId)
      assert.strictEqual(Object.keys(response).length, 0)
    }).timeout(10000)
  })
})

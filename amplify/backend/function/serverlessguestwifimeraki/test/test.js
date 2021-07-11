const expect = require('chai')
const assert = require('assert')
const Meraki = require('../lib/nodejs/Meraki')


const apiKey = process.env.MERAKI_API_KEY
const invalidApiKey = apiKey.slice(0, -1)
const baseUrl = process.env.MERAKI_BASE_URL
const invalidBaseUrl = baseUrl.slice(0, -1)
const serial = process.env.MERAKI_SERIAL
const invalidSerial = serial.slice(0, -1)
const merakiNetworkId = process.env.MERAKI_NETWORK_ID
const invalidtMerakiNetworkId = merakiNetworkId.slice(0, -1)


describe('Meraki.js tests', () => {
  describe('Generic Test', () => {
    const meraki = new Meraki(invalidApiKey, baseUrl)
    meraki.logging = false
    it('should return "Invalid API key"', async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.equal(error.message, `Invalid API key`)
      }
    }).timeout(10000)
    it('should return "Invalid URL"', async () => {
      meraki.apiKey = apiKey
      meraki.baseUrl = invalidBaseUrl
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.equal(error.message, `Invalid URL`)
      }
    }).timeout(10000)
  })

  describe('Meraki Claim/Remove Network Device', () => {
    const meraki = new Meraki(apiKey, baseUrl)
    meraki.logging = false
    // Claim valid serial
    it('should return {}', async () => {
      const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      assert.deepEqual(response, {})
    }).timeout(10000)
    // Claim already claimed serial
    it(`should return "Device with serial ${serial} is already claimed and in Default"`, async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.equal(error.message, `Device with serial ${serial} is already claimed and in Default`)
      }
    }).timeout(10000)
    // Claim invalid serial
    it(`should return "Device with serial ${invalidSerial} not found"`, async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [invalidSerial])
      } catch(error) {
        assert.equal(error.message, `Device with serial ${invalidSerial} not found`)
      }
    }).timeout(10000)
    // Remove valid serial
    it('should return "Invalid URL"', async () => {
      const response = await meraki.removeNetworkDevices(merakiNetworkId, serial)
      assert.deepEqual(response, {})
    }).timeout(10000)
    // Remove already removed serial
    it('should return "Invalid URL"', async () => {
      try {
        const response = await meraki.removeNetworkDevices(merakiNetworkId, serial)
      } catch(error) {
        assert.equal(error.message, 'Invalid URL')
      }
    }).timeout(10000)
    // Remove invalid serial
    it('should return "Device not found"', async () => {
      try {
        const response = await meraki.removeNetworkDevices(merakiNetworkId, invalidSerial)
      } catch(error) {
        assert.equal(error.message, 'Device not found')
      }
    }).timeout(10000)
    // Claim valid serial with invalid network
    it('should return "Invalid URL"', async () => {
      try {
        const response = await meraki.claimNetworkDevices(invalidtMerakiNetworkId, [serial])
      } catch(error) {
        assert.equal(error.message, 'Invalid URL')
      }
    }).timeout(10000)
  })
})

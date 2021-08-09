const expect = require('chai')
const assert = require('assert')
const { Meraki } = require('../lib/nodejs/Meraki')


const apiKey = process.env.MERAKI_API_KEY
const invalidApiKey = apiKey.slice(0, -1)
const baseUrl = process.env.MERAKI_BASE_URL
const invalidBaseUrl = baseUrl.slice(0, -1)
const serial = process.env.MERAKI_SERIAL
const invalidSerial = serial.slice(0, -1)
const merakiNetworkId = process.env.MERAKI_NETWORK_ID
const invalidtMerakiNetworkId = merakiNetworkId.slice(0, -1)
const merakiOrganizationId = process.env.MERAKI_ORGANIZATION_ID


describe('Meraki.js tests', () => {
  describe('Generic Test', () => {
    const meraki = new Meraki(invalidApiKey, baseUrl)
    meraki.logging = false
    it('should return "Invalid API key"', async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.strictEqual(error.message, `Invalid API key`)
      }
    }).timeout(10000)
    it('should return "Invalid URL"', async () => {
      meraki.apiKey = apiKey
      meraki.baseUrl = invalidBaseUrl
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.strictEqual(error.message, `Invalid URL`)
      }
    }).timeout(10000)
  })

  describe('Meraki Claim/Remove Network Device', () => {
    const meraki = new Meraki(apiKey, baseUrl)
    meraki.logging = false
    // Check unclaimed serial
    it('should return "Invalid URL"', async () => {
      try {
        const response = await meraki.getOrganizationInventoryDevice(merakiOrganizationId, invalidSerial)
      } catch(error) {
        assert.strictEqual(error.message, "Invalid URL")
      }
    }).timeout(10000)
    // Claim valid serial into org
    it(`should return "{ orders: [], serials: [ '${serial}' ], licenses: [] }"`, async () => {
      const response = await meraki.claimIntoOrganization(merakiOrganizationId, [serial])
      assert.deepStrictEqual(response, { orders: [], serials: [ serial ], licenses: [] })
    }).timeout(10000)
    // Claim already claimed valid serial into org
    it(`should return "{ orders: [], serials: [ '${serial}' ], licenses: [] }"`, async () => {
      const response = await meraki.claimIntoOrganization(merakiOrganizationId, [serial])
      assert.deepStrictEqual(response, { orders: [], serials: [ serial ], licenses: [] })
    }).timeout(10000)
    // Claim invalid serial into org
    it(`should return error.status=400, error.message="Device with serial '${serial}' not found"`, async () => {
      try {
        const response = await meraki.claimIntoOrganization(merakiOrganizationId, [invalidSerial])
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.message, `Device with serial '${invalidSerial}' not found`)
      }
    }).timeout(10000)
    // Claim valid serial
    it('should return {}', async () => {
      const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      assert.deepStrictEqual(response, {})
    }).timeout(10000)
    // Claim serial that is already added to network into org
    it(`should return error.status=400, error.message="Device with serial '${serial}' not found"`, async () => {
      try {
        const response = await meraki.claimIntoOrganization(merakiOrganizationId, [serial])
        console.log(response)
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.message, `Device with serial '${serial}' is already claimed`)
      }
    }).timeout(10000)
    // Check claimed serial
    it(`should return ${serial}`, async () => {
      const response = await meraki.getOrganizationInventoryDevice(merakiOrganizationId, serial)
      assert.deepStrictEqual(response.serial, serial)
    }).timeout(10000)
    // Claim already claimed serial
    it(`should return "Device with serial ${serial} is already claimed and in Default"`, async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [serial])
      } catch(error) {
        assert.strictEqual(error.message, `Device with serial ${serial} is already claimed and in Default`)
      }
    }).timeout(10000)
    // Claim invalid serial
    it(`should return error.status=400, error.message="Device with serial ${invalidSerial} not found"`, async () => {
      try {
        const response = await meraki.claimNetworkDevices(merakiNetworkId, [invalidSerial])
      } catch(error) {
        assert.strictEqual(error.status, 400)
        assert.strictEqual(error.message, `Device with serial ${invalidSerial} not found`)
      }
    }).timeout(10000)
    // Remove valid serial
    it('should return "Invalid URL"', async () => {
      const response = await meraki.removeNetworkDevices(merakiNetworkId, serial)
      assert.deepStrictEqual(response, {})
    }).timeout(10000)
    // Remove already removed serial
    it('should return "Invalid URL"', async () => {
      try {
        const response = await meraki.removeNetworkDevices(merakiNetworkId, serial)
      } catch(error) {
        assert.strictEqual(error.message, 'Invalid URL')
      }
    }).timeout(10000)
    // Remove invalid serial
    it('should return "Device not found"', async () => {
      try {
        const response = await meraki.removeNetworkDevices(merakiNetworkId, invalidSerial)
      } catch(error) {
        assert.strictEqual(error.message, 'Device not found')
      }
    }).timeout(10000)
    // Check once claimed and currently unclaimed serial
    it(`should return response.serial=${serial} and response.networkId=null`, async () => {
      const response = await meraki.getOrganizationInventoryDevice(merakiOrganizationId, serial)
      assert.deepStrictEqual(response.serial, serial)
      assert.deepStrictEqual(response.networkId, null)
    }).timeout(10000)
    // Claim valid serial with invalid network
    it('should return "Invalid URL"', async () => {
      try {
        const response = await meraki.claimNetworkDevices(invalidtMerakiNetworkId, [serial])
      } catch(error) {
        assert.strictEqual(error.message, 'Invalid URL')
      }
    }).timeout(10000)
  })
})

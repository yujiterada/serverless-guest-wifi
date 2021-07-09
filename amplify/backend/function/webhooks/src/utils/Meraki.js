const fetch = require('node-fetch')

class Meraki {
  constructor(apiKey='', baseUrl='') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async claimIntoOrganization(organizationId, serials) {
    console.log(`[Meraki][claimIntoOrganization] organizationId=${organizationId} serials=${serials}`)
    const path = `/organizations/${organizationId}/claim`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        },
        body: JSON.stringify({
          serials: serials
        })
      })
      return response
    } catch (err) {
      console.warn(`[Meraki][claimIntoOrganization] err=${err}`)
      throw new Error(err)
    }
  }

  async claimNetworkDevices(networkId, serials) {
    console.log(`[Meraki][claimNetworkDevices] networkId=${networkId} serials=${serials}`)
    const path = `/networks/${networkId}/devices/claim`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        },
        body: JSON.stringify({
          serials: serials
        })
      })
      return response
    } catch(err) {
      console.warn(`[Meraki][claimNetworkDevices] err=${err}`)
      throw new Error(err)
    }
  }

  async removeNetworkDevices(networkId, serial) {
    console.log(`[Meraki][removeNetworkDevices] networkId=${networkId} serial=${serial}`)
    const path = `/networks/${networkId}/devices/remove`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        },
        body: JSON.stringify({
          serial: serial
        })
      })
      return response
    } catch(err) {
      console.warn(`[Meraki][removeNetworkDevices] err=${err}`)
      throw new Error(err)
    }
  }

  async getOrganizationInventoryDevice(organizationId, serial) {
    console.log(`[Meraki][getOrganizationInventoryDevice] organizationId=${organizationId} serial=${serial}`)
    const path = `/organizations/${organizationId}/inventoryDevices/${serial}`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        }
      })
      return response
    } catch(err) {
      console.warn(`[Meraki][getOrganizationInventoryDevice] err=${err}`)
      throw new Error(err)
    }
  }

  async createNetworkMerakiAuthUser(networkId, email, name, password, authorizations, accountType, emailPasswordToUser) {
    console.log(`[Meraki][createNetworkMerakiAuthUser] networkId=${networkId} email=${email} name=${name} authorizations=${authorizations} accountType=${accountType} emailPasswordToUser=${emailPasswordToUser}`)
    const path = `/networks/${networkId}/merakiAuthUsers`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        },
        body: JSON.stringify({
          email: email,
          name: name,
          password: password,
          authorizations: authorizations,
          accountType: accountType,
          emailPasswordToUser: emailPasswordToUser
        })
      })
      return response
    } catch(err) {
      console.warn(`[Meraki][createNetworkMerakiAuthUser] err=${err}`)
      throw new Error(err)
    }
  }

  async updateNetworkMerakiAuthUser(networkId, merakiAuthUserId, password, authorizations, emailPasswordToUser) {
    console.log(`[Meraki][updateNetworkMerakiAuthUser] networkId=${networkId} merakiAuthUserId=${merakiAuthUserId} authorizations[0].ssidNumber=${authorizations[0].ssidNumber} emailPasswordToUser=${emailPasswordToUser}`)
    const path = `/networks/${networkId}/merakiAuthUsers/${merakiAuthUserId}`
    const url = this.baseUrl + path
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'X-Cisco-Meraki-API-Key': this.apiKey
        },
        body: JSON.stringify({
          password: password,
          authorizations: authorizations,
          emailPasswordToUser: emailPasswordToUser
        })
      })
      return response
    } catch(err) {
      console.warn(`[Meraki][createNetworkMerakiAuthUser] err=${err}`)
      throw new Error(err)
    }
  }
}

module.exports = Meraki
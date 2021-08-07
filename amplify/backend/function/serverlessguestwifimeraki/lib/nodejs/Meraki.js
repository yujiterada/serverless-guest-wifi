const fetch = require('node-fetch')


class APIError extends Error {

  constructor(response, data, ...params) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }

    this.name = 'APIError'
    this.status = response.status
    this.statusText = response.statusText
    this.contentType = response.headers.get('content-type')
    this.message = 'errors' in data ? data.errors[0] : ''
  }
}


class Meraki {
  constructor(apiKey='', baseUrl='') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.headers = {
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'X-Cisco-Meraki-API-Key': this.apiKey
    }
    this.maxRetries = 3
    this.logging = true
  }

  async call(path='', options={}, attempt=0) {
    const retryCodes = [429]
    let url = this.baseUrl + path
    const headers = {
      'Accept': '*/*',
      'Content-Type': 'application/json',
      'X-Cisco-Meraki-API-Key': this.apiKey
    }
    try {
      while (attempt < this.maxRetries) {
        const response = await fetch(url, options)
        let data = {}
        if (response.headers.get('content-type')) {
          if(response.headers.get('content-type').startsWith('application/json')) {
            data = await response.json()
          }
        }

        // 2XX success
        if (response.ok) {
          return data
        }
        // 429
        else if (retryCodes.includes(response.status) ) {
          attempt+=1
        }
        // 3XX clients errors
        else if (response.status >= 300 && response.status <= 399) {
          url = response.headers['Location']
          attempt += 1
        }
        // 4XX clients errors
        else if (response.status >= 400 && response.status <= 499) {
          switch (response.status) {
            case 400:
              throw new APIError(response, data)
            case 401:
              throw new APIError(response, data)
            case 404:
              data = 'errors' in data ? data : { 'errors': ['Invalid URL']}
              throw new APIError(response, data)
            // 402, 403, 405+
            default:
              this.logging && console.log(response)
              throw new APIError(response, data)
          }
        }
        // 5XX 
        else {
          this.logging && console.log(response)
          throw new APIError(response, data)
        }
      }
    }
    catch (err) {
      throw err
    }
  }

  async claimIntoOrganization(organizationId, serials) {
    /*
     * Response
     *  200 - success, return {} (empty Object())
     *  400 - Device with serial '${serial}' not found
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     */
    this.logging && console.log(`[Meraki][claimIntoOrganization] organizationId=${organizationId} serials=${serials}`)
    const path = `/organizations/${organizationId}/claim`
    const url = this.baseUrl + path
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        serials: serials
      })
    }
    return await this.call(path, options)
  }

  async claimNetworkDevices(networkId, serials) {
    /*
     * Response
     *  200 - success, return {} (empty Object())
     *  400 - Device with serial XXXX-XXXX-XXXX is already claimed and in Y
     *        Device with serial XXXX-XXXX-XXXX is already calimed
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     */
    this.logging && console.log(`[Meraki][claimNetworkDevices] networkId=${networkId} serials=${serials}`)
    const path = `/networks/${networkId}/devices/claim`
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        serials: serials
      })
    }
    return await this.call(path, options)
  }

  async removeNetworkDevices(networkId, serial) {
    /*
     * Response
     *  204 - success, return {} (empty Object())
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     *        Device not found
     */
    this.logging && console.log(`[Meraki][removeNetworkDevices] networkId=${networkId} serial=${serial}`)
    const path = `/networks/${networkId}/devices/remove`
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        serial: serial
      })
    }
    return await this.call(path, options)
  }

  async getOrganizationInventoryDevice(organizationId, serial) {
    /*
     * Response
     *  200 - success, return device:{}
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     */
    this.logging && console.log(`[Meraki][getOrganizationInventoryDevice] organizationId=${organizationId} serial=${serial}`)
    const path = `/organizations/${organizationId}/inventoryDevices/${serial}`
    const options = {
      method: 'GET',
      headers: this.headers
    }
    return await this.call(path, options)
  }

  async createNetworkMerakiAuthUser(networkId, email, name, password, authorizations, accountType, emailPasswordToUser) {
    this.logging && console.log(`[Meraki][createNetworkMerakiAuthUser] networkId=${networkId} email=${email} name=${name} authorizations=${authorizations} accountType=${accountType} emailPasswordToUser=${emailPasswordToUser}`)
    const path = `/networks/${networkId}/merakiAuthUsers`
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        email: email,
        name: name,
        password: password,
        authorizations: authorizations,
        accountType: accountType,
        emailPasswordToUser: emailPasswordToUser
      })
    }
    return await this.call(path, options)
  }

  async updateNetworkMerakiAuthUser(networkId, merakiAuthUserId, password, authorizations, emailPasswordToUser) {
    this.logging && console.log(`[Meraki][updateNetworkMerakiAuthUser] networkId=${networkId} merakiAuthUserId=${merakiAuthUserId} authorizations=${authorizations} emailPasswordToUser=${emailPasswordToUser}`)
    const path = `/networks/${networkId}/merakiAuthUsers/${merakiAuthUserId}`
    const options = {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        password: password,
        authorizations: authorizations,
        emailPasswordToUser: emailPasswordToUser
      })
    }
    return await this.call(path, options)
  }
}

module.exports = { APIError, Meraki }

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
    this.message = 'message' in data ? data.message : ''
  }
}


class Webex {
  constructor(accessToken='', baseUrl='') {
    this.accessToken = accessToken
    this.baseUrl = baseUrl
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
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

  async createMessage(body) {
    /*
     * Response
     *  200 - success, return {} (empty Object())
     *  400 - Device with serial '${serial}' not found
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     */
    this.logging && console.log(`[Webex][createMessage] Try to create a message`)
    const path = "/messages"
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }
    return await this.call(path, options)
  }

  async createWebhook(body) {
    /*
     * Response
     *  200 - success, return {} (empty Object())
     *  400 - 
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL
     */
    this.logging && console.log(`[Webex][createWebhook] Try to create a webhook`)
    const path = "/webhooks"
    const options = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    }
    return await this.call(path, options)
  }

  async deleteWebhook(webhookId) {
    /*
     * Response
     *  200 - success, return {} (empty Object())
     *  400 - 
     *  401 - Invalid API Key, Missing API Key
     *  404 - Invalid URL, Not Found
     */
    this.logging && console.log(`[Webex][createWebhook] Try to delete webhook with id=${webhookId}`)
    const path = `/webhooks/${webhookId}`
    const options = {
      method: 'DELETE',
      headers: this.headers
    }
    return await this.call(path, options)
  }

  async getWebhookAttachmentActionDetails(actionId) {
    this.logging && console.log(`[Webex][createWebhook] Try to get webhook attachment action details with id=${actionId}`)
    const path = `/attachment/actions/${actionId}`
    const options = {
      method: 'GET',
      headers: this.headers
    }
    return await this.call(path, options)

  }
}

module.exports = { APIError, Webex }

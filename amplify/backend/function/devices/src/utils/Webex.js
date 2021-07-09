const fetch = require('node-fetch')

class Webex {
  constructor(accessToken, baseUrl) {
    this.baseUrl = baseUrl
    this.accessToken = accessToken
  }

  async sendText(toPersonEmail, text) {
    console.log(`[Webex][sendText] toPersonEmail=${toPersonEmail} text=${text}`)
    const url = this.baseUrl + "/messages"
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
    const body = {
      text: text,
      toPersonEmail: toPersonEmail
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      })
      return response
    } catch(err) {
      console.log(`[Webex][sendText] err=${err}`)
      throw new Error(err)
    }
  }

  async sendCard(roomId, markdown, card) {
    console.log(`[Webex][sendCard] roomId=${roomId} markdown=${markdown}`)
    const url = this.baseUrl + "/messages"
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
    const body = {
      roomId: roomId,
      markdown: markdown,
      attachments: [card]
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      })
      return response
    } catch(err) {
      console.log(`[Webex][sendCard] err=${err}`)
      throw new Error(err)
    }
  }
  
  async deleteMessage(messageId) {
    console.log(`[Webex][deleteMessage] messageId=${messageId}`)
    const url = this.baseUrl + "/messages" + messageId
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: headers
      })
      return response
    } catch(err) {
      console.log(`[Webex][deleteMessage] err=${err}`)
      throw new Error(err)
    }
  }

  async createWebhook(name, resource, event, targetUrl, filter, secret) {
    console.log(`[Webex][createWebhook] name=${name} resource=${resource} event=${event} targetUrl=${targetUrl} filter=${filter} secret=${secret}`)
    const url = this.baseUrl + "/webhooks"
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
    const body = {
      name: name,
      resource: resource,
      event: event,
      targetUrl: targetUrl,
      filter: filter,
      secret: secret
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      })
      return response
    } catch(err) {
      console.log(`[Webex][createWebhook] err=${err}`)
      throw new Error(err)
    }
  }


  async getWebhookAttachmentActionDetails(actionId) {
    console.log(`[Webex][getWebhookAttachmentActionDetails] Fetching webhook attachment details with actionId=${actionId}`)
    const url = `${this.baseUrl}/attachment/actions/${actionId}`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    }
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      })
      return response
    } catch(err) {
      console.log(`[Webex][getWebhookAttachmentActionDetails] err=${err}`)
      throw new Error(err)
    }
  }
}

function BinaryCard(title, id, imageUrl, kv, message, trueText, falseText) {

  const keys = Object.keys(kv)
  let columnLeft = []
  let columnRight = []
  for (let i = 0; i < keys.length; i++) {
    if (i === 0) {
      columnLeft.push({
        "type": "TextBlock",
        "text": keys[i],
        "color": "Light"
      })
      columnRight.push({
        "type": "TextBlock",
        "text": kv[keys[i]],
        "color": "Light"
      })
    }
    else {
      columnLeft.push({
        "type": "TextBlock",
        "text": keys[i],
        "weight": "Lighter",
        "color": "Light",
        "spacing": "Small"
      })
      columnRight.push({
        "type": "TextBlock",
        "text": kv[keys[i]],
        "weight": "Lighter",
        "color": "Light",
        "spacing": "Small"
      })
    }
  }

  return {
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "type": "AdaptiveCard",
      "body": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "items": [
                {
                  "type": "Image",
                  "style": "Person",
                  "url": imageUrl,
                  "size": "Medium",
                  "height": "50px"
                }
              ],
              "width": "auto"
            },
            {
              "type": "Column",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "APICLI",
                  "weight": "Lighter",
                  "color": "Accent"
                },
                {
                  "type": "TextBlock",
                  "weight": "Bolder",
                  "text": title,
                  "horizontalAlignment": "Left",
                  "wrap": true,
                  "color": "Light",
                  "size": "Large",
                  "spacing": "Small"
                }
              ],
              "width": "stretch"
            }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": 35,
              "items": columnLeft
            },
            {
              "type": "Column",
              "width": 65,
              "items": columnRight
            }
          ],
          "spacing": "Padding",
          "horizontalAlignment": "Center"
        },
        {
          "type": "TextBlock",
          "text": message,
          "wrap": true
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.Submit",
              "title": trueText,
              "data": {
                "action": true,
                "id": id
              }
            },
            {
              "type": "Action.Submit",
              "title": falseText,
              "data": {
                "action": false,
                "id": id
              }
            }
          ],
          "horizontalAlignment": "Right",
          "spacing": "None"
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.2"
    }
  }
}

module.exports = { Webex, BinaryCard }